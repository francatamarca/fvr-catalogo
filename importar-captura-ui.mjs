// Importa una lectura completa de los listados visibles de Madrid Center.
// Uso: node importar-captura-ui.mjs ruta/captura.json
// La captura y catalogo.json contienen costos: nunca se publican.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { precioFVR } from './pricing.mjs';
import { pasaFiltroArgentina, esReacondicionado, grupoDisplay, slugify, recargoPara,
  PESO_MAX_KG, esExcluidoEspecial } from './config.mjs';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Falta el archivo de captura completa.');
const source = JSON.parse(await readFile(sourcePath, 'utf8'));
if (source.next !== null || !Array.isArray(source.categoriesExpected) || source.categoriesExpected.length !== 21 ||
    !Array.isArray(source.reports) || !Array.isArray(source.rows)) throw new Error('La lectura de categorías no está terminada.');
if (!Number.isFinite(Date.parse(source.capturado)) || Date.now() - Date.parse(source.capturado) > 24 * 3600000) throw new Error('La captura no es de las últimas 24 horas.');
for (const name of source.categoriesExpected) {
  const reports = source.reports.filter(r => r.category === name);
  const rows = source.rows.filter(r => r.categoria === name);
  if (reports.length !== 1 || reports[0].total !== reports[0].count || rows.length !== reports[0].total ||
      new Set(rows.map(r => r.codigo)).size !== rows.length) throw new Error(`Categoría incompleta o duplicada: ${name}`);
}
if (source.reports.reduce((n,r) => n + r.total, 0) !== source.rows.length) throw new Error('El total de filas no coincide con el proveedor.');
const previous = JSON.parse(await readFile(process.argv[3] || 'data/catalogo.json', 'utf8'));
const prev = new Map(previous.productos.map(p => [String(p.codigo), p]));
const unique = new Map();
for (const r of source.rows) {
  if (!/^\d+$/.test(r.codigo) || !r.titulo || typeof r.available !== 'boolean' || !Number.isFinite(r.usd) || r.usd <= 0 ||
      !source.categoriesExpected.includes(r.categoria)) throw new Error('Fila de proveedor inválida.');
  const old = unique.get(r.codigo);
  if (old && (old.usd !== r.usd || old.available !== r.available)) throw new Error(`Datos contradictorios para ${r.codigo}`);
  unique.set(r.codigo, r);
}
const hoy = new Date().toLocaleDateString('en-CA', { timeZone:'America/Argentina/Buenos_Aires' });
const recent = d => d && Date.now() - Date.parse(d) <= 7 * 86400000;
const counters = { vistos:unique.size, filas_listados:source.rows.length, agotados:0, ocultos_por_piso:0,
  excluidos_por_peso:0, excluidos_especiales:0, nuevos:0, repuestos:0, peso_pendiente:0 };
const productos=[];
for (const r of unique.values()) {
  if (!r.available) { counters.agotados++; continue; }
  const before=prev.get(r.codigo);
  const marca=r.marca || before?.marca || (/\bApple\b/i.test(r.titulo)?'APPLE':'');
  // Conservamos la categoría hoja verificada de los SKU conocidos. Para altas,
  // identificamos las familias con tarifa fija a partir del nombre visible.
  let categoria=before?.categoria || r.categoria;
  if (/^(?:notebook|ultrabook|apple macbook|macbook)\b/i.test(r.titulo)) categoria='Notebook';
  else if (/^(?:tablet|apple ipad|ipad)\b/i.test(r.titulo)) categoria='Tablet';
  else if (/^(?:celular|smartphone|apple iphone|iphone)\b/i.test(r.titulo)) categoria='Celular';
  else if (!before && r.categoria==='Celulares e SmartPhones') categoria='Telefonía y accesorios';
  if (!pasaFiltroArgentina(r.usd,categoria)) { counters.ocultos_por_piso++; continue; }
  const pesoKg=before?.pesoKg ?? null;
  if (pesoKg!=null && pesoKg>PESO_MAX_KG) { counters.excluidos_por_peso++; continue; }
  if (esExcluidoEspecial(r.titulo,categoria)) { counters.excluidos_especiales++; continue; }
  const grupo=grupoDisplay(categoria);
  // Console es el nombre portugués mostrado por la web; la tarifa PS5 utiliza Consola.
  const tituloPrecio=r.titulo.replace(/^Console\b/i,'Consola');
  const precio=precioFVR({usd:r.usd,categoria,marca,titulo:tituloPrecio,pesoKg,recargo:recargoPara(tituloPrecio,categoria)});
  const nuevoDesde=before?.nuevoDesde || (before?.esNuevo ? previous.generado?.slice(0,10) : null) || (!before?hoy:null);
  const esNuevo=!!recent(nuevoDesde);
  const repuesto=before?.disponible===false || before?.stock===0;
  if(esNuevo)counters.nuevos++;
  if(repuesto)counters.repuestos++;
  if(pesoKg==null && precio.via!=='fija')counters.peso_pendiente++;
  const precioAnterior=r.oldUSD>r.usd?precioFVR({usd:r.oldUSD,categoria,marca,titulo:tituloPrecio,pesoKg,recargo:recargoPara(tituloPrecio,categoria)}):null;
  const unit=p=>p.via==='fija'?p.final_usd:p.precio_unit_usd;
  const descuento=precioAnterior&&unit(precioAnterior)>unit(precio)?Math.round((1-unit(precio)/unit(precioAnterior))*100):null;
  productos.push({codigo:r.codigo,titulo:before?.titulo || r.titulo,slug:r.href.split('/').at(-1),marca,
    categoria,catNombre:grupo.nombre,catSlug:slugify(grupo.nombre),catEmoji:grupo.emoji,
    img:r.imgs[0]||before?.img||null,imgs:r.imgs.slice(1,6),madridUSD:r.usd,
    descuento,
    pesoKg,vol:before?.vol??null,stock:null,disponible:true,
    logisticaPendiente:pesoKg==null&&precio.via!=='fija',reacond:esReacondicionado(r.titulo),
    specs:before?.specs||[],precio,nuevoDesde,esNuevo,repuesto,
    ...(before?.ocultoAR?{ocultoAR:true,ar:before.ar}:{}),
  });
}
if(productos.length<Math.max(100,Math.floor(previous.productos.length*.7)))throw new Error('El resultado cae por debajo del umbral de integridad.');
productos.sort((a,b)=>Number(b.codigo)-Number(a.codigo));
const categories=new Map();
for(const p of productos){if(!categories.has(p.catSlug))categories.set(p.catSlug,{slug:p.catSlug,nombre:p.catNombre,emoji:p.catEmoji,cantidad:0});categories.get(p.catSlug).cantidad++;}
const now=new Set(productos.map(p=>p.codigo));
counters.pasaron_a_sin_stock=previous.productos.filter(p=>!now.has(String(p.codigo))).length;
const out={generado:source.capturado,publicado:new Date().toISOString(),total:productos.length,categorias:[...categories.values()].sort((a,b)=>b.cantidad-a.cantidad),
  fuente:{metodo:'listados públicos visibles de Madrid Center',capturado:source.capturado,categorias_validadas:source.reports.length},resumen:counters,productos};
await writeFile('data/catalogo.json.tmp',JSON.stringify(out));
await rename('data/catalogo.json.tmp','data/catalogo.json');
await writeFile('data/sync-status.json',JSON.stringify({ok:true,...out.fuente,generado:out.generado,productosPublicados:out.total,resumen:counters},null,2));
console.log(JSON.stringify({generado:out.generado,total:out.total,categorias:out.categorias.length,resumen:counters},null,2));
