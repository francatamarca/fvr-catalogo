// Reprocesa data/catalogo.json aplicando el clasificador de categorías actualizado (sin llamar a Madrid Center)
import { readFile, writeFile } from 'node:fs/promises';
import { grupoDisplay, slugify } from './config.mjs';

const c = JSON.parse(await readFile('./data/catalogo.json', 'utf8'));
for (const p of c.productos) {
  const g = grupoDisplay(p.categoria || '', {});
  p.catNombre = g.nombre; p.catSlug = slugify(g.nombre); p.catEmoji = g.emoji;
}
const catMap = new Map();
for (const p of c.productos) {
  if (!catMap.has(p.catSlug)) catMap.set(p.catSlug, { slug: p.catSlug, nombre: p.catNombre, emoji: p.catEmoji, cantidad: 0 });
  catMap.get(p.catSlug).cantidad++;
}
c.categorias = [...catMap.values()].sort((a, b) => b.cantidad - a.cantidad);
await writeFile('./data/catalogo.json', JSON.stringify(c));
console.log('✅ Reclasificado. Categorías:');
console.log(c.categorias.map(x => `${x.emoji}${x.nombre}:${x.cantidad}`).join('  '));
const otros = c.categorias.find(x => x.slug === 'otros');
console.log('\nOtros:', otros?.cantidad || 0, `de ${c.total} (${Math.round((otros?.cantidad || 0) / c.total * 100)}%)`);
