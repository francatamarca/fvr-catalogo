// Comparación automática contra retailers argentinos (Naldo, OnCity, Cetrogar — APIs VTEX abiertas).
// Anota en data/catalogo.json: p.ar = {ars, usd, fuente, titulo} cuando hay match confiable,
// y p.ocultoAR = true si el precio FVR pierde contra el más barato NUEVO de Argentina.
// Solo actúa con matching CONSERVADOR (marca+modelo+almacenamiento) para no ocultar por error.
import { readFile, writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const FUENTES = [
  { n: 'Naldo', base: 'https://www.naldo.com.ar' },
  { n: 'OnCity', base: 'https://www.oncity.com' },
  { n: 'Cetrogar', base: 'https://www.cetrogar.com.ar' },
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- cotización USDT (CriptoYa, la más conveniente como en la web) ----------
async function usdtRate() {
  const r = await fetch('https://criptoya.com/api/usdt/ars/1', { headers: { 'user-agent': UA } });
  const j = await r.json();
  const vals = Object.values(j).map(v => v?.totalAsk || v?.ask).filter(n => typeof n === 'number' && n > 0);
  return Math.min(...vals);
}

// ---------- armar consulta desde el título de Madrid Center ----------
const VARIANTES = ['pro', 'max', 'plus', 'mini', 'ultra', 'se', 'air', 'lite', 'note', 'active'];
function buildQuery(p) {
  const t = norm(p.titulo);
  // almacenamiento: "6/256gb" (el 2do) o "256gb"
  let storage = null;
  const mDual = t.match(/(\d+)\s*\/\s*(\d+)\s*gb/); if (mDual) storage = mDual[2];
  else { const mS = t.match(/(\d{2,4})\s*gb/); if (mS) storage = mS[1]; }
  // pack múltiple (ej: "Tracker 4 Pack")
  let pack = null;
  const mP = t.match(/(\d)\s*pack\b/) || t.match(/\bpack\s*(?:de\s*)?(\d)\b/) || t.match(/\bx\s?(\d)\s*(?:unidades|u\b)/);
  if (mP) pack = mP[1];

  if (t.includes('iphone')) {
    const m = t.match(/iphone\s+(\d{1,2})(\s+pro)?(\s+max)?(\s+plus)?(\s+mini)?(\s+e\b)?/);
    if (!m) return null;
    const partes = ['iphone', m[1]];
    if (m[2]) partes.push('pro'); if (m[3]) partes.push('max'); if (m[4]) partes.push('plus'); if (m[5]) partes.push('mini');
    if (storage) partes.push(storage);
    return { q: partes.join(' '), tokens: partes, storage, pack, familia: 'iphone' };
  }
  // genérico: marca + tokens de modelo del primer segmento del título (sin códigos tipo A2650LL / 40MEZ443)
  const marca = norm(p.marca).trim().split(/\s+/)[0];
  const primerSeg = t.split(' - ')[0]
    .replace(/^(celular|notebook|tablet|apple)\s+/g, '');
  const toks = primerSeg.split(/\s+/).filter(w =>
    w && w !== marca && !/^[a-z]?\d{4,}[a-z0-9\/-]*$/i.test(w) && !/\//.test(w) && w.length > 1
  ).slice(0, 4);
  if (!toks.length) return null;
  const partes = [marca, ...toks];
  if (storage) partes.push(storage);
  return { q: partes.join(' '), tokens: partes, storage, pack, familia: 'gen' };
}

// ---------- validar candidato (matching conservador) ----------
const SUBFAMILIAS = ['redmi', 'poco', 'note', 'galaxy'];
function matchea(query, titulo, precioArs, fvrArs) {
  const t = norm(titulo);
  // todos los tokens de la consulta tienen que estar
  for (const tok of query.tokens) if (!t.includes(tok)) return false;
  // guard de variantes (TODAS las familias): el candidato no puede tener una variante que la consulta no tiene
  // (evita comparar iPhone 14 con 14 Pro, o Xiaomi Pad con Pad Pro)
  for (const v of VARIANTES) {
    const enQ = query.tokens.some(x => x === v);
    const enT = new RegExp(`\\b${v}\\b`).test(t);
    if (enT && !enQ) return false;
  }
  // guard de subfamilias: "xiaomi 15" no puede matchear "redmi note 15"
  for (const s of SUBFAMILIAS) {
    const enQ = query.tokens.some(x => x === s);
    if (new RegExp(`\\b${s}\\b`).test(t) && !enQ) return false;
  }
  // guard de packs: un "4 Pack" no puede compararse con la unidad suelta
  if (query.pack) {
    if (!/\bpack\b|\bx\s?\d\b|\bkit\b/.test(t)) return false;
    if (query.pack !== '1' && !t.includes(query.pack)) return false;
  } else if (/\b\d\s*pack\b|\bpack\s*\d\b/.test(t)) return false;
  // almacenamiento debe coincidir si lo tenemos
  if (query.storage && !t.includes(query.storage)) return false;
  // sanidad de precio: descartar accesorios (fundas/cables salen a <20% del precio esperado)
  if (precioArs < fvrArs * 0.2) return false;
  return true;
}

// ---------- buscar en una fuente VTEX ----------
async function buscar(fuente, q) {
  try {
    const url = `${fuente.base}/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(q)}&_from=0&_to=9`;
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (!r.ok && r.status !== 206) return [];
    const j = await r.json();
    return (Array.isArray(j) ? j : []).map(p => {
      const of = p.items?.[0]?.sellers?.[0]?.commertialOffer;
      return { titulo: p.productName, ars: of?.Price, stock: of?.AvailableQuantity || 0 };
    }).filter(c => c.ars > 0 && c.stock > 0);
  } catch { return []; }
}

async function main() {
  const c = JSON.parse(await readFile('data/catalogo.json', 'utf8'));
  const rate = await usdtRate();
  console.log(`USDT = $${Math.round(rate)} ARS`);

  const objetivo = c.productos.filter(p => ['celulares', 'notebooks', 'tablets'].includes(p.catSlug));
  console.log(`Comparando ${objetivo.length} productos (celulares/notebooks/tablets) contra ${FUENTES.map(f => f.n).join(', ')}...`);

  let ocultos = 0, conMatch = 0, sinQuery = 0;
  for (let i = 0; i < objetivo.length; i++) {
    const p = objetivo[i];
    const fvrUsd = p.precio.via === 'fija' ? p.precio.final_usd : (p.precio.precio_unit_usd + (p.precio.flete_usd || 0));
    const fvrArs = fvrUsd * rate;
    const query = buildQuery(p);
    delete p.ar; p.ocultoAR = false;
    if (!query) { sinQuery++; continue; }

    const resultados = await Promise.all(FUENTES.map(f => buscar(f, query.q)));
    let mejor = null;
    resultados.forEach((cands, idx) => {
      for (const cand of cands) {
        if (!matchea(query, cand.titulo, cand.ars, fvrArs)) continue;
        if (!mejor || cand.ars < mejor.ars) mejor = { ...cand, fuente: FUENTES[idx].n };
      }
    });

    if (mejor) {
      conMatch++;
      p.ar = { ars: mejor.ars, usd: Math.round(mejor.ars / rate), fuente: mejor.fuente, titulo: mejor.titulo };
      if (mejor.ars <= fvrArs) {
        p.ocultoAR = true; ocultos++;
        console.log(`  OCULTAR [${p.codigo}] ${p.titulo.slice(0, 45)} | FVR $${fvrUsd} vs AR $${p.ar.usd} (${mejor.fuente})`);
      }
    }
    if ((i + 1) % 25 === 0) console.log(`  ...${i + 1}/${objetivo.length} (matches ${conMatch}, a ocultar ${ocultos})`);
    await sleep(250);
  }

  c.comparacionAR = { fecha: c.generado, fuentes: FUENTES.map(f => f.n), comparados: objetivo.length, con_match: conMatch, ocultos, usdt: Math.round(rate) };
  await writeFile('data/catalogo.json', JSON.stringify(c));
  console.log(`\n✅ Comparación AR: ${conMatch} con precio AR encontrado · ${ocultos} quedan OCULTOS por perder contra Argentina · ${sinQuery} sin consulta armable`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
