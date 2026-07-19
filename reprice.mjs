// Reprocesa data/catalogo.json con el motor de precios actual (recargos, tope de peso)
// SIN llamar a Madrid Center. Usar tras cambiar reglas en config.mjs / pricing.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { precioFVR } from './pricing.mjs';
import { recargoPara, PESO_MAX_KG, esExcluidoEspecial } from './config.mjs';

const c = JSON.parse(await readFile('./data/catalogo.json', 'utf8'));
const antes = c.productos.length;

c.productos = c.productos.filter(p =>
  !(p.pesoKg != null && p.pesoKg > PESO_MAX_KG) &&
  !esExcluidoEspecial(p.titulo || '', p.categoria || '')
);
const sacadosPeso = antes - c.productos.length;

let conRecargo = 0;
for (const p of c.productos) {
  const recargo = recargoPara(p.titulo || '', p.categoria || '');
  if (recargo > 0) conRecargo++;
  p.precio = precioFVR({ usd: p.madridUSD, categoria: p.categoria, marca: p.marca, pesoKg: p.pesoKg, recargo });
}

// recontar categorías
const catMap = new Map();
for (const p of c.productos) {
  if (!catMap.has(p.catSlug)) catMap.set(p.catSlug, { slug: p.catSlug, nombre: p.catNombre, emoji: p.catEmoji, cantidad: 0 });
  catMap.get(p.catSlug).cantidad++;
}
c.categorias = [...catMap.values()].sort((a, b) => b.cantidad - a.cantidad);
c.total = c.productos.length;

await writeFile('./data/catalogo.json', JSON.stringify(c));
console.log(`✅ Reprocesado: ${c.total} productos (${sacadosPeso} sacados por pesar > ${PESO_MAX_KG}kg, ${conRecargo} con recargo fijo)`);

// muestras de control
const mues = c.productos.filter(p => recargoPara(p.titulo || '', p.categoria || '') > 0).slice(0, 5);
for (const p of mues) {
  const precio = p.precio.via === 'fija' ? p.precio.final_usd : p.precio.precio_unit_usd;
  console.log(`  [+recargo] ${p.titulo.slice(0, 55)} | Madrid ${p.madridUSD} -> FVR $${precio}`);
}
