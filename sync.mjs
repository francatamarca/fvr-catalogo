// Sync worker FVR — recorre TODO Madrid Center (menos comestibles), aplica precios/filtros
// y genera data/catalogo.json. Uso: node sync.mjs [--full]  (--full = sin tope)
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { precioFVR } from './pricing.mjs';
import {
  MC_API, CATEGORIAS_EXCLUIDAS,
  pasaFiltroArgentina, esReacondicionado, grupoDisplay, slugify,
  recargoPara, PESO_MAX_KG, esExcluidoEspecial,
} from './config.mjs';

const FULL = process.argv.includes('--full');
const CAP = FULL ? Infinity : 1200;
const DATA = './data/catalogo.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const excluida = c => CATEGORIAS_EXCLUIDAS.some(x => (c || '').toLowerCase().includes(x));
const STATUS = './data/sync-status.json';

// Mismos parámetros públicos que utiliza la web actual de Madrid Center (API v4).
// El filtro de stock coincide en estadísticas y páginas para validar el total correcto.
function searchURL(params = {}) {
  const url = new URL(MC_API);
  url.search = new URLSearchParams({ idioma: 'es', limit: '100', orden: 'relevance',
    formato_simple: 'false', formato_completo: 'true', solo_con_stock: 'true',
    incluir_estadisticas: 'true', ...params }).toString();
  return url.href;
}

function categoriasDe(tree) {
  const raw = tree.estadisticas?.categorias_disponibles || tree.estadisticas?.categorias || [];
  return Array.isArray(raw) ? raw : Object.entries(raw).map(([id, value]) =>
    typeof value === 'object' && value !== null ? { id, ...value } : { id, nombre: id });
}

async function readPrevious() {
  if (existsSync(DATA)) {
    try { return JSON.parse(await readFile(DATA, 'utf8')); } catch {}
  }
  // Runner cloud fresh checkout: use the last sanitized release for novelty/stock continuity.
  try { return JSON.parse(gunzipSync(await readFile('./data/catalogo.public.json.gz')).toString('utf8')); }
  catch { return { productos: [] }; }
}

async function apiGet(url) {
  for (let intento = 0; intento < 5; intento++) {
    let res;
    try { res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) }); }
    catch (e) {
      if (intento === 4) throw new Error(`No se pudo consultar la API pública de Madrid Center: ${e.message}`);
      await sleep(1500 * (intento + 1));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (intento < 4) { await sleep(Math.min(5000 * (intento + 1), 20000)); continue; }
    }
    if (res.status === 403) {
      throw new Error('La API v4 de Madrid Center rechazó esta consulta HTTP (403). Se conserva el catálogo anterior. Este código por sí solo no demuestra que haga falta una clave de API o un permiso nuevo.');
    }
    if (!res.ok) throw new Error(`API Madrid Center respondió HTTP ${res.status}.`);
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) throw new Error(`La API respondió contenido no JSON (${type || 'tipo desconocido'}); puede ser un desafío o una respuesta no válida.`);
    return res.json();
  }
  throw new Error('Madrid Center no respondió tras 5 intentos; se conserva la publicación anterior.');
}

async function main() {
  let prev = await readPrevious();
  const prevMap = new Map(prev.productos.map(p => [p.codigo, p]));
  const hayPrev = prev.productos.length > 0;
  const hoy = new Date().toISOString().slice(0, 10);
  const DIAS_NOVEDAD = 7;
  const esReciente = (fecha) => fecha && (Date.now() - new Date(fecha).getTime()) <= DIAS_NOVEDAD * 86400000;

  console.log('→ consultando la API pública de Madrid Center con acceso HTTP estándar...');

  // 1) árbol de categorías en ES y PT -> emparejar por id -> mapa nombre(cualquier idioma)->categoría top ES
  const treeES = await apiGet(searchURL({ idioma: 'es', limit: '1' }));
  const treePT = await apiGet(searchURL({ idioma: 'pt', limit: '1' }));
  const idToTopES = {};
  for (const top of categoriasDe(treeES)) {
    idToTopES[top.id] = top.nombre;
    for (const sub of (top.subcategorias || [])) idToTopES[sub.id] = top.nombre;
  }
  const nameToTop = {};
  const registrar = (tree) => {
    for (const top of categoriasDe(tree)) {
      if (idToTopES[top.id]) nameToTop[top.nombre] = idToTopES[top.id];
      for (const sub of (top.subcategorias || [])) if (idToTopES[sub.id]) nameToTop[sub.nombre] = idToTopES[sub.id];
    }
  };
  registrar(treeES); registrar(treePT);
  const totalCatalogo = Number(treeES.estadisticas?.total_productos ?? treeES.estadisticas?.total ?? treeES.estadisticas?.count);
  if (!Number.isFinite(totalCatalogo) || totalCatalogo < 1) throw new Error('El proveedor no informó un total válido de productos; publicación cancelada.');
  console.log(`   catálogo Madrid Center: ${totalCatalogo} productos · ${Object.keys(nameToTop).length} nombres de categoría mapeados`);

  // 2) pasada global por cursor. Se arma en memoria y sólo se reemplaza el archivo al finalizar.
  const productos = [];
  let cursor = null, vistos = 0, pagina = 0, ocultosPorPiso = 0, excluidos = 0;
  process.stdout.write('   trayendo');
  let completo = false;
  while (vistos < CAP) {
    const url = searchURL(cursor ? { cursor: String(cursor) } : {});
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
      const precio = precioFVR({ usd, categoria: cat, marca: p.marca, titulo: p.titulo || '', pesoKg, recargo: recargoPara(p.titulo || '', cat) });
      const before = prevMap.get(p.codigo);
      // The public snapshot omits stock counts; don't mistake an absent field for zero stock.
      const tieneHistorialStock = before && Object.hasOwn(before, 'stock');
      const nuevoDesde = before?.nuevoDesde || (before?.esNuevo ? prev.generado?.slice(0, 10) : null) ||
        (before ? null : (hayPrev ? hoy : null));
      productos.push({
        codigo: p.codigo, titulo: p.titulo, slug: p.slug, marca: p.marca,
        categoria: cat, catNombre: grupo.nombre, catSlug: slugify(grupo.nombre), catEmoji: grupo.emoji,
        img: p.imagen_principal?.url_optimizada || p.imagen_principal?.url_original || null,
        imgs: (p.imagenes_adicionales || []).map(i => i.url_optimizada || i.url_original).filter(Boolean).slice(0, 5),
        madridUSD: usd, descuento: p.precio?.descuento_porcentaje || null,
        pesoKg, stock: p.stock?.cantidad ?? null,
        // volumen en cm³ (para peso volumétrico de Via Cargo en el carrito)
        vol: (p.dimensiones?.altura && p.dimensiones?.ancho && p.dimensiones?.profundidad)
          ? Math.round(p.dimensiones.altura * p.dimensiones.ancho * p.dimensiones.profundidad) : null,
        reacond: esReacondicionado(p.titulo),
        specs: (p.especificaciones_destacadas || []).map(s => ({ n: s.nombre, v: s.valor })),
        precio,
        // fecha en que apareció por primera vez -> "Novedades" durante 7 días (persistente entre syncs)
        nuevoDesde,
        esNuevo: esReciente(nuevoDesde),
        repuesto: !!(tieneHistorialStock && (before.stock === 0 || before.stock == null) && (p.stock?.cantidad > 0)),
      });
    }
    cursor = data.paginacion?.siguiente_cursor;
    pagina++;
    if (pagina % 5 === 0) process.stdout.write(` ${productos.length}`);
    else process.stdout.write('.');
    if (!data.paginacion?.tiene_mas) { completo = true; break; }
    if (!cursor) throw new Error('El proveedor indicó que hay más páginas pero no entregó cursor; publicación cancelada.');
    if (pagina >= 300) throw new Error('Se alcanzó el límite de seguridad de 300 páginas antes de completar el catálogo.');
    await sleep(500); // pausa suave para no saturar la API pública
  }
  if (!completo && FULL) throw new Error(`Recorrido incompleto: ${vistos} de ${totalCatalogo} productos leídos. Se conserva la publicación anterior.`);
  if (FULL && vistos !== totalCatalogo) throw new Error(`Control de integridad falló: Madrid Center informa ${totalCatalogo} productos y se leyeron ${vistos}. No se publicará una baja masiva.`);
  if (!FULL && productos.length < Math.max(100, Math.floor(prev.productos.length * 0.7))) throw new Error('El catálogo parcial quedó por debajo del umbral de seguridad; no se publica.');
  if (new Set(productos.map(p => String(p.codigo))).size !== productos.length) throw new Error('El proveedor devolvió códigos duplicados; publicación cancelada.');

  const codigosAhora = new Set(productos.map(p => p.codigo));
  const sinStock = prev.productos.filter(p => !codigosAhora.has(p.codigo)).map(p => p.codigo);
  if (!productos.length || productos.length < Math.max(100, Math.floor(prev.productos.length * 0.7))) throw new Error('La respuesta produciría un catálogo vacío o incompleto; publicación cancelada.');

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
  const tmp = `${DATA}.tmp`;
  await writeFile(tmp, JSON.stringify(out));
  await rename(tmp, DATA);
  await writeFile(STATUS, JSON.stringify({ ok: true, generado: out.generado, productosFuente: vistos, productosPublicados: productos.length, categorias: categorias.length, resumen: out.resumen }, null, 2));
  console.log(`\n\n✅ Catálogo: ${out.total} productos en ${categorias.length} categorías`);
  console.log('   ' + categorias.slice(0, 12).map(c => `${c.emoji}${c.nombre}:${c.cantidad}`).join('  '));
  console.log('   Diff:', JSON.stringify(out.resumen));
}

main().catch(async e => {
  console.error('ERROR:', e.message);
  try { await writeFile(STATUS, JSON.stringify({ ok: false, fallido: new Date().toISOString(), error: e.message }, null, 2)); } catch {}
  process.exit(1);
});
