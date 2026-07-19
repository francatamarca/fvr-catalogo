// Sync worker FVR — recorre TODO Madrid Center (menos comestibles), aplica precios/filtros
// y genera data/catalogo.json. Uso: node sync.mjs [--full]  (--full = sin tope)
import puppeteer from 'puppeteer-core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { precioFVR } from './pricing.mjs';
import {
  MC_API, MC_HOME, CHROME_PATH, UA, CATEGORIAS_EXCLUIDAS,
  pasaFiltroArgentina, esReacondicionado, grupoDisplay, slugify,
  recargoPara, PESO_MAX_KG, esExcluidoEspecial,
} from './config.mjs';

const FULL = process.argv.includes('--full');
const CAP = FULL ? Infinity : 1200;
const DATA = './data/catalogo.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const excluida = c => CATEGORIAS_EXCLUIDAS.some(x => (c || '').toLowerCase().includes(x));

async function main() {
  let prev = { productos: [] };
  if (existsSync(DATA)) { try { prev = JSON.parse(await readFile(DATA, 'utf8')); } catch {} }
  const prevMap = new Map(prev.productos.map(p => [p.codigo, p]));
  const hayPrev = prev.productos.length > 0;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH, headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  console.log('→ pasando Cloudflare...');
  await page.goto(MC_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const apiGet = async (url) => {
    for (let i = 0; i < 24; i++) {
      const res = await page.evaluate(async u => {
        try { const r = await fetch(u, { headers: { accept: 'application/json' } });
          const t = await r.text(); return { s: r.status, j: t.trim().startsWith('{'), t }; }
        catch { return { s: -1 }; }
      }, url);
      if (res.s === 200 && res.j) return JSON.parse(res.t);
      if (res.s === 429) { await sleep(Math.min(8000 + i * 2000, 30000)); continue; } // rate-limit: backoff, sin re-navegar
      if (i === 6 || i === 13) { // 403/challenge: re-navegar a la home
        try { await page.goto(MC_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch {}
      }
      await sleep(2500);
    }
    throw new Error('Madrid Center no respondió (posible rate-limit): ' + url);
  };

  // 1) árbol de categorías en ES y PT -> emparejar por id -> mapa nombre(cualquier idioma)->categoría top ES
  const treeES = await apiGet(`${MC_API}?country=py&idioma=es&limit=1`);
  const treePT = await apiGet(`${MC_API}?country=py&idioma=pt&limit=1`);
  const idToTopES = {};
  for (const top of (treeES.estadisticas?.categorias_disponibles || [])) {
    idToTopES[top.id] = top.nombre;
    for (const sub of (top.subcategorias || [])) idToTopES[sub.id] = top.nombre;
  }
  const nameToTop = {};
  const registrar = (tree) => {
    for (const top of (tree.estadisticas?.categorias_disponibles || [])) {
      if (idToTopES[top.id]) nameToTop[top.nombre] = idToTopES[top.id];
      for (const sub of (top.subcategorias || [])) if (idToTopES[sub.id]) nameToTop[sub.nombre] = idToTopES[sub.id];
    }
  };
  registrar(treeES); registrar(treePT);
  const totalCatalogo = treeES.estadisticas?.total_productos;
  console.log(`   catálogo Madrid Center: ${totalCatalogo} productos · ${Object.keys(nameToTop).length} nombres de categoría mapeados`);

  // 2) pasada global por cursor
  const productos = [];
  let cursor = null, vistos = 0, pagina = 0, ocultosPorPiso = 0, excluidos = 0;
  process.stdout.write('   trayendo');
  while (vistos < CAP) {
    const url = `${MC_API}?country=py&idioma=es&limit=100&orden=relevance&formato_completo=true&solo_con_stock=true${cursor ? `&cursor=${cursor}` : ''}`;
    const data = await apiGet(url);
    const lote = data.productos || [];
    if (!lote.length) break;

    for (const p of lote) {
      vistos++;
      const usd = p.precio?.usd;
      const cat = p.categoria || '';
      if (usd == null) continue;
      if (excluida(cat)) { excluidos++; continue; }
      if (!pasaFiltroArgentina(usd, cat)) { ocultosPorPiso++; continue; }
      const pesoKg = p.dimensiones?.peso ?? null;
      if (pesoKg != null && pesoKg > PESO_MAX_KG) { continue; } // sin ruta para bultos grandes por ahora
      if (esExcluidoEspecial(p.titulo || '', cat)) { continue; } // motos eléctricas etc.
      const grupo = grupoDisplay(cat, nameToTop);
      const precio = precioFVR({ usd, categoria: cat, marca: p.marca, pesoKg, recargo: recargoPara(p.titulo || '', cat) });
      const before = prevMap.get(p.codigo);
      productos.push({
        codigo: p.codigo, titulo: p.titulo, slug: p.slug, marca: p.marca,
        categoria: cat, catNombre: grupo.nombre, catSlug: slugify(grupo.nombre), catEmoji: grupo.emoji,
        img: p.imagen_principal?.url_optimizada || p.imagen_principal?.url_original || null,
        imgs: (p.imagenes_adicionales || []).map(i => i.url_optimizada || i.url_original).filter(Boolean).slice(0, 5),
        madridUSD: usd, descuento: p.precio?.descuento_porcentaje || null,
        pesoKg, stock: p.stock?.cantidad ?? null,
        reacond: esReacondicionado(p.titulo),
        specs: (p.especificaciones_destacadas || []).map(s => ({ n: s.nombre, v: s.valor })),
        precio,
        esNuevo: hayPrev && !before,
        repuesto: !!(before && (before.stock === 0 || before.stock == null) && (p.stock?.cantidad > 0)),
      });
    }
    cursor = data.paginacion?.siguiente_cursor;
    pagina++;
    if (pagina % 5 === 0) process.stdout.write(` ${productos.length}`);
    else process.stdout.write('.');
    if (!data.paginacion?.tiene_mas || !cursor) break;
    if (pagina > 300) break;
    await sleep(500); // pausa suave entre páginas para no gatillar el rate-limit de Cloudflare
  }

  const codigosAhora = new Set(productos.map(p => p.codigo));
  const sinStock = prev.productos.filter(p => !codigosAhora.has(p.codigo)).map(p => p.codigo);
  await browser.close();

  // categorías de display con conteo, ordenadas por cantidad
  const catMap = new Map();
  for (const p of productos) {
    if (!catMap.has(p.catSlug)) catMap.set(p.catSlug, { slug: p.catSlug, nombre: p.catNombre, emoji: p.catEmoji, cantidad: 0 });
    catMap.get(p.catSlug).cantidad++;
  }
  const categorias = [...catMap.values()].sort((a, b) => b.cantidad - a.cantidad);

  if (!existsSync('./data')) await mkdir('./data', { recursive: true });
  const out = {
    generado: new Date().toISOString(),
    total: productos.length,
    categorias,
    resumen: {
      vistos, excluidos_comestibles: excluidos, ocultos_por_piso: ocultosPorPiso,
      nuevos: productos.filter(p => p.esNuevo).length,
      repuestos: productos.filter(p => p.repuesto).length,
      reacondicionados: productos.filter(p => p.reacond).length,
      pasaron_a_sin_stock: sinStock.length,
    },
    productos,
  };
  await writeFile(DATA, JSON.stringify(out));
  console.log(`\n\n✅ Catálogo: ${out.total} productos en ${categorias.length} categorías`);
  console.log('   ' + categorias.slice(0, 12).map(c => `${c.emoji}${c.nombre}:${c.cantidad}`).join('  '));
  console.log('   Diff:', JSON.stringify(out.resumen));
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
