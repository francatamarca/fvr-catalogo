// Une disponibilidad y nombres de la vista ES con USD observados, sin convertir guaraníes.
// Los archivos de entrada/salida tienen costos y deben permanecer fuera del repositorio.
import fs from 'node:fs/promises';
const [stockPath,usdPath,altasPath,outPath]=process.argv.slice(2);
if(!outPath)throw Error('Uso: node conciliar-stock-ui.mjs stock.json usd.json altas.json salida-privada.json');
const [stock,base,altas]=await Promise.all([stockPath,usdPath,altasPath].map(async p=>JSON.parse(await fs.readFile(p,'utf8'))));
if(stock.next!==null||stock.reports?.length!==21||stock.categoriesExpected?.length!==21||!stock.capturado||Date.now()-Date.parse(stock.capturado)>86400000)throw Error('Revisión de stock incompleta o antigua.');
const prices=new Map(base.rows.map(r=>[r.codigo,r]));
for(const a of altas){if(!a.available||!Number.isFinite(a.usd)||a.usd<=0)throw Error('Precio de alta inválido');prices.set(a.codigo,a);}
const rows=[],reports=[];const duplicateDetails=[];
for(const category of stock.categoriesExpected){
  const report=stock.reports.find(r=>r.category===category),observed=stock.rows.filter(r=>r.categoria===category);
  if(!report||report.count!==observed.length||report.total!==observed.length||Math.abs((report.totalMostrado??report.total)-report.count)>1)throw Error('Categoría incompleta: '+category);
  const unique=new Map();
  for(const r of observed){
    if(!/^\d+$/.test(r.codigo)||!r.titulo||typeof r.available!=='boolean')throw Error('Tarjeta inválida');
    const old=unique.get(r.codigo);if(old){duplicateDetails.push({category,codigo:r.codigo});if(old.available!==r.available)throw Error('Disponibilidad contradictoria: '+r.codigo);}
    unique.set(r.codigo,r);
  }
  for(const r of unique.values()){
    const price=prices.get(r.codigo);
    if(r.available&&(!price||!Number.isFinite(price.usd)||price.usd<=0))throw Error('Falta USD observado: '+r.codigo);
    const marca=r.marca&&!/^-?\d+%$/.test(r.marca.trim())?r.marca:price?.marca||'';
    rows.push({...r,marca,usd:price?.usd??null,oldUSD:price?.oldUSD??null});
  }
  reports.push({category,total:unique.size,count:unique.size,totalMostrado:report.totalMostrado??report.total,filasObservadas:observed.length});
}
const cross=new Map();for(const r of rows){if(cross.has(r.codigo)&&cross.get(r.codigo).available!==r.available)throw Error('Stock contradictorio entre categorías: '+r.codigo);cross.set(r.codigo,r);}
const out={capturado:base.capturado,stockRevisado:stock.capturado,lecturaIniciada:stock.iniciado,idioma:'es',source:stock.source,categoriesExpected:stock.categoriesExpected,reports,next:null,rows,conciliacion:{preciosBase:base.capturado,preciosNuevosVerificados:altas.length,duplicadosOrigen:duplicateDetails,filasObservadas:stock.rows.length,codigosUnicos:cross.size}};
await fs.writeFile(outPath,JSON.stringify(out));
console.log(JSON.stringify({precios:out.capturado,stock:out.stockRevisado,filas:rows.length,codigos:cross.size,disponibles:[...cross.values()].filter(r=>r.available).length,preciosNuevos:altas.length,duplicadosOrigen:duplicateDetails},null,2));
