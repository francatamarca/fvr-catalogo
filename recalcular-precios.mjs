// Recalcula las reglas FVR sobre costos guardados sin cambiar la fecha de stock/proveedor.
import fs from 'node:fs/promises';
import {precioFVR} from './pricing.mjs';
import {recargoPara} from './config.mjs';
const file='data/catalogo.json';
const catalogo=JSON.parse(await fs.readFile(file,'utf8'));
const source=process.argv[2]?JSON.parse(await fs.readFile(process.argv[2],'utf8')):null;
const rows=new Map((source?.rows||[]).map(r=>[String(r.codigo),r]));
const cambios=[];
const unit=p=>p.via==='fija'?p.final_usd:p.precio_unit_usd;
for(const p of catalogo.productos){
  const usd=p.madridUSD??p.precio?.base_usd;
  if(!Number.isFinite(usd)||usd<=0)throw Error('Costo faltante para '+p.codigo);
  const titulo=p.titulo.replace(/^Console\b/i,'Consola');
  const input={usd,categoria:p.categoria,marca:p.marca,titulo,pesoKg:p.pesoKg??null,recargo:recargoPara(titulo,p.categoria)};
  const nueva=precioFVR(input),anterior=p.precio;
  if(unit(nueva)!==unit(anterior))cambios.push({codigo:p.codigo,titulo:p.titulo,anterior:unit(anterior),nuevo:unit(nueva)});
  p.precio=nueva;
  const oldUSD=rows.get(String(p.codigo))?.oldUSD;
  if(Number.isFinite(oldUSD)&&oldUSD>usd){const old=precioFVR({...input,usd:oldUSD});p.descuento=Math.round((1-unit(nueva)/unit(old))*100)||null;}
}
catalogo.reglasPreciosActualizadas=new Date().toISOString();
await fs.writeFile(file+'.tmp',JSON.stringify(catalogo));
await fs.rename(file+'.tmp',file);
console.log(JSON.stringify({total:catalogo.total,productosConCambio:cambios.length,cambios},null,2));
