// Genera data/catalogo.public.json.gz (saneado: SIN el precio de costo de Paraguay) para hostear.
// Excluye los productos marcados ocultoAR (pierden contra el precio argentino, ver compare-ar.mjs).
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { clientProduct } from './lib/catalogo.js';

const c = JSON.parse(readFileSync('data/catalogo.json', 'utf8'));
// tabla de envíos Via Cargo (cotizada automáticamente) — viaja junto al catálogo
let envios = null;
if (existsSync('data/envios.json')) {
  const e = JSON.parse(readFileSync('data/envios.json', 'utf8'));
  envios = { generado: e.generado, divisor_volumetrico: e.divisor_volumetrico, tabla: e.tabla.map(t => ({ kg: t.kg, usd: t.usd })) };
}
const visibles = c.productos.filter(p => !p.ocultoAR);
const ocultosAR = c.productos.length - visibles.length;

// recontar categorías sobre los visibles
const catMap = new Map();
for (const p of visibles) {
  if (!catMap.has(p.catSlug)) catMap.set(p.catSlug, { slug: p.catSlug, nombre: p.catNombre, emoji: p.catEmoji, cantidad: 0 });
  catMap.get(p.catSlug).cantidad++;
}

const pub = {
  generado: c.generado, total: visibles.length,
  categorias: [...catMap.values()].sort((a, b) => b.cantidad - a.cantidad),
  resumen: { ...c.resumen, ocultos_por_precio_ar: ocultosAR },
  envios,
  productos: visibles.map(p => clientProduct(p, true)),
};
writeFileSync('data/catalogo.public.json.gz', gzipSync(Buffer.from(JSON.stringify(pub))));
const kb = (statSync('data/catalogo.public.json.gz').size / 1024).toFixed(0);
const s = JSON.stringify(pub);
const leak = s.includes('base_usd') || s.includes('madridUSD') || s.includes('"ar":');
console.log(`✅ catalogo.public.json.gz — ${pub.productos.length} visibles (${ocultosAR} ocultos por precio AR) — ${kb} KB`);
console.log(leak ? '⚠️  ATENCIÓN: quedó info interna en el público' : '🔒 OK: sin costo ni datos internos en el archivo público');
