// Genera data/catalogo.public.json.gz (saneado: SIN el precio de costo de Paraguay) para hostear.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { clientProduct } from './lib/catalogo.js';

const c = JSON.parse(readFileSync('data/catalogo.json', 'utf8'));
const pub = {
  generado: c.generado, total: c.total, categorias: c.categorias, resumen: c.resumen,
  productos: c.productos.map(p => clientProduct(p, true)),
};
writeFileSync('data/catalogo.public.json.gz', gzipSync(Buffer.from(JSON.stringify(pub))));
const kb = (statSync('data/catalogo.public.json.gz').size / 1024).toFixed(0);
// verificación de seguridad: que no haya quedado ningún precio de costo
const leak = JSON.stringify(pub).includes('base_usd') || JSON.stringify(pub).includes('logistica_usd');
console.log(`✅ catalogo.public.json.gz — ${pub.productos.length} productos — ${kb} KB`);
console.log(leak ? '⚠️  ATENCIÓN: quedó info de costo en el público' : '🔒 OK: sin precio de costo en el archivo público');
