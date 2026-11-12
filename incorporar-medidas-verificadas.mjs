// Incorpora medidas visibles guardadas desde la ficha del proveedor, sin tocar precios ni stock.
import fs from 'node:fs/promises';
const file=process.argv[2];
if(!file)throw Error('Falta la captura de fichas verificadas');
const captura=JSON.parse(await fs.readFile(file,'utf8'));
const c=JSON.parse(await fs.readFile('data/catalogo.json','utf8'));
const index=new Map(c.productos.map(p=>[String(p.codigo),p]));
for(const r of captura.productos){
  const p=index.get(String(r.codigo));if(!p)throw Error('Código ausente: '+r.codigo);
  const d=r.texto.match(/Dimensões\s*([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)\s*cm/i);
  const w=r.texto.match(/Peso\s*([\d.]+)\s*kg/i);
  if(!d||!w)throw Error('Faltan medidas o peso en la evidencia de '+r.codigo);
  const medidas=d.slice(1).map(Number),peso=Number(w[1]),vol=Math.round(medidas.reduce((a,b)=>a*b,1));
  if(medidas.some(v=>!(v>0))||!(peso>0)||peso>60||(p.pesoKg!=null&&peso!==p.pesoKg)||(p.vol!=null&&Math.abs(vol-p.vol)>1))throw Error('Datos distintos a los guardados; revisar antes de importar '+r.codigo);
  if(p.pesoKg==null&&p.precio.via!=='fija')throw Error('Peso nuevo de un general: revisar primero su regla de precio '+r.codigo);
  p.pesoKg=peso;p.vol=vol;
  p.medidasCm=medidas;p.medidasRevisadas=captura.capturado;
}
await fs.writeFile('data/catalogo.json.tmp',JSON.stringify(c));
await fs.rename('data/catalogo.json.tmp','data/catalogo.json');
console.log('OK: medidas verificadas de '+captura.productos.length+' productos; precios, stock y fechas del catálogo conservados.');
