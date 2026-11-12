// Genera data/catalogo.public.json.gz (saneado: SIN el precio de costo de Paraguay) para hostear.
// Excluye los productos marcados ocultoAR (pierden contra el precio argentino, ver compare-ar.mjs).
import { readFileSync, writeFileSync, statSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { clientProduct } from './lib/catalogo.js';

const c = JSON.parse(readFileSync('data/catalogo.json', 'utf8'));
if (!c.generado || !Number.isFinite(Date.parse(c.generado)) || !Array.isArray(c.productos) || c.productos.length < 100 || !Array.isArray(c.categorias) || !c.categorias.length) {
  throw new Error('Catálogo vacío o inválido; se conserva la versión pública anterior.');
}
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
const s = JSON.stringify(pub);
const leak = /"(?:base_usd|madridUSD|ocultoAR|stock|ar)"\s*:/.test(s);
if (leak) throw new Error('Se detectaron campos internos en el archivo público.');
if (!pub.productos.length || pub.productos.length < Math.min(100, c.productos.length)) throw new Error('El catálogo saneado quedó vacío/incompleto; publicación cancelada.');
const tmp = 'data/catalogo.public.json.gz.tmp';
try { unlinkSync(tmp); } catch {}
writeFileSync(tmp, gzipSync(Buffer.from(JSON.stringify(pub))));
renameSync(tmp, 'data/catalogo.public.json.gz');
const kb = (statSync('data/catalogo.public.json.gz').size / 1024).toFixed(0);
console.log(`✅ catalogo.public.json.gz — ${pub.productos.length} visibles (${ocultosAR} ocultos por precio AR) — ${kb} KB`);
console.log('🔒 OK: sin costo ni inventario interno en el archivo público');
