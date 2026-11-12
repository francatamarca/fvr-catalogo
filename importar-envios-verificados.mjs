// Publica las cotizaciones leídas en el formulario oficial sin automatizar el navegador.
// Uso: node importar-envios-verificados.mjs captura.json cotizacion-usdt.json
import fs from 'node:fs/promises';
import {leerCotizacion,tarifaUSD} from './lib/envios.js';
const [capturaFile,rateFile]=process.argv.slice(2);
if(!capturaFile||!rateFile) throw Error('Faltan captura y cotización USDT');
const c=JSON.parse(await fs.readFile(capturaFile,'utf8'));
const r=JSON.parse(await fs.readFile(rateFile,'utf8'));
const esperados=[1,2,3,5,7,10,12,15,20,25,30,40,50,60];
if(JSON.stringify(c.tabla.map(t=>t.kg))!==JSON.stringify(esperados))throw Error('Deben estar los 14 tramos completos y ordenados');
if(!c.origen.includes('IGUAZU')||!c.destino.includes('JUJUY')||c.bultos!==1||c.valorDeclarado!==100000||c.pago!=='destino')throw Error('Cambió la referencia de envío');
for(const date of [c.iniciado,c.terminado,r.capturado])if(!Number.isFinite(Date.parse(date))||Math.abs(Date.now()-Date.parse(date))>86400000)throw Error('Captura o cotización fuera de las últimas 24 horas');
const tabla=c.tabla.map(t=>{
  const leido=leerCotizacion(t.texto);
  if(leido.dom!==t.ars_dom||leido.suc!==t.ars_suc||!t.texto.includes(c.origen)||!t.texto.includes(c.destino))throw Error('Evidencia inconsistente para '+t.kg+'kg');
  return {kg:t.kg,ars_dom:leido.dom,ars_suc:leido.suc,usd:tarifaUSD(leido.dom,leido.suc,r.rate)};
});
const out={generado:new Date().toISOString(),cotizadoDesde:c.iniciado,cotizadoHasta:c.terminado,
  fuente:c.fuente,usdt:r.rate,usdtFuente:r.fuente,usdtCapturado:r.capturado,
  origen:c.origen,destino:c.destino,bultos:1,valorDeclarado:100000,pago:'destino',
  regla:'domicilio+5USD o sucursal+10USD; redondeo hacia arriba',
  divisor_volumetrico:5000,voluminosos_a_cotizar:true,max_peso_bulto_kg:50,
  nota:'Tarifa de referencia. Las medidas y el peso se confirman al despachar. El servicio a domicilio informa hasta 50kg por bulto; los bultos superiores requieren confirmación.',
  sondas_volumetricas:(c.sondas||[]).map(({kg,lado,ars_dom,ars_suc,capturado})=>({kg,lado,ars_dom,ars_suc,capturado})),tabla};
await fs.writeFile('data/envios.json.tmp',JSON.stringify(out,null,2)+'\n');
await fs.rename('data/envios.json.tmp','data/envios.json');
console.log(JSON.stringify({usdt:r.rate,tabla:tabla.map(({kg,usd})=>({kg,usd}))},null,2));
