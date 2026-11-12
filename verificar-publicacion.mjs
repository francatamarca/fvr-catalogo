import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {calcCarrito,reconciliarPedido,mensajePedido,COMPRA_MINIMA} from './lib/cart.js';
import {esExcluidoEspecial} from './config.mjs';

const publicText=gunzipSync(readFileSync('data/catalogo.public.json.gz')).toString('utf8');
const c=JSON.parse(publicText);
assert.equal(c.total,c.productos.length);
assert.equal(new Set(c.productos.map(p=>String(p.codigo))).size,c.total);
assert.equal(c.categorias.reduce((n,x)=>n+x.cantidad,0),c.total);
assert.equal(COMPRA_MINIMA,300);
const shipping=JSON.parse(readFileSync('data/envios.json','utf8'));
const item=(precio,extra={})=>({via:'general',precioUnit:precio,qty:1,pesoKg:1,...extra});
const belowMinimum=calcCarrito([item(299)],shipping);
assert.equal(belowMinimum.minimoOk,false);assert.equal(belowMinimum.faltaMinimo,1);
assert.equal(belowMinimum.total,323); // El envío no completa la compra mínima.
assert.equal(calcCarrito([item(300)],shipping).minimoOk,true);
assert.equal(calcCarrito([item(299,{via:'fija'})],shipping).minimoOk,false);
assert.equal(calcCarrito([item(150,{via:'fija'}),item(150)],shipping).minimoOk,true);
assert.equal(calcCarrito([item(499,{pesoKg:5})],shipping).envio,24);
assert.equal(calcCarrito([item(500,{pesoKg:5})],shipping).envio,0);
assert.equal(calcCarrito([item(600,{pesoKg:12})],shipping).envio,10);
const wholesale=calcCarrito([item(1000,{pesoKg:5})],shipping);
assert.equal(wholesale.descuento1000,74);assert.equal(wholesale.total,926);
assert.ok(!/"(?:base_usd|madridUSD|stock|ocultoAR|ar)"\s*:/.test(publicText));
assert.ok(c.productos.every(p=>!esExcluidoEspecial(p.titulo,p.categoria)));
assert.ok(c.productos.every(p=>(p.precio.final_usd??p.precio.precio_unit_usd)>0));

const unknown=calcCarrito([{via:'general',precioUnit:600,qty:1,pesoKg:null,vol:null}]);
assert.equal(unknown.consultar,true);assert.equal(unknown.gratis,false);assert.equal(unknown.envio,0);
assert.match(mensajePedido([],unknown,null),/falta peso|faltan datos/);
const known=calcCarrito([{via:'general',precioUnit:600,qty:1,pesoKg:5,vol:null}]);
assert.equal(known.gratis,true);assert.equal(known.consultar,false);
const fixed=calcCarrito([{via:'fija',precioUnit:1000,qty:1,pesoKg:null,vol:null}]);
assert.equal(fixed.consultar,false);assert.equal(fixed.envio,0);
const alreadyWholesale=calcCarrito([{via:'general',precioUnit:1200,qty:1,pesoKg:2,m25:true}]);
assert.equal(alreadyWholesale.descuento1000,0);
const saved=[{codigo:1,titulo:'SKU vigente',precioUnit:10,via:'general',qty:3},{codigo:2,precioUnit:8,via:'general',qty:1}];
const refreshed=reconciliarPedido(saved,[['1','general',12,false,2,null]]);
assert.equal(refreshed.items.length,1);assert.equal(refreshed.items[0].qty,3);assert.equal(refreshed.items[0].precioUnit,12);assert.equal(refreshed.cambio,true);
assert.equal(esExcluidoEspecial('Moto Elétrica Smartfy'),true);
assert.equal(esExcluidoEspecial('Scooter eléctrica'),true);

// La lectura por defecto de producción debe funcionar sin consultar GitHub Raw.
process.env.NODE_ENV='production';delete process.env.CATALOGO_URL;
globalThis.fetch=()=>{throw new Error('La publicación local no debe depender de HTTP');};
const {getCatalogo}=await import('./lib/catalogo.js');
assert.equal((await getCatalogo()).generado,c.generado);
assert.equal((await getCatalogo()).total,c.total);

if(process.argv[2]){
  const source=JSON.parse(readFileSync(process.argv[2],'utf8'));
  const rows=new Map(source.rows.map(r=>[r.codigo,r]));
  assert.ok(c.productos.every(p=>rows.get(String(p.codigo))?.available===true));
  if(source.idioma==='es'){
    assert.equal(c.stockRevisado,source.stockRevisado);
    assert.equal(c.categorias.length,21);
    assert.ok(c.productos.every(p=>!/^[-\d]+%$/.test(p.marca||'')));
    assert.ok(c.productos.every(p=>!(/\b(Feminino|Unissex|Preto|Branco|Cinza|Carregador|Cabelo|Suporte)\b/i.test(p.titulo))));
    const iphoneCodes=[...rows.values()].filter(r=>r.available&&/\biPhone 18\b/i.test(r.titulo)).map(r=>r.codigo).sort();
    assert.deepEqual(c.productos.filter(p=>/\biPhone 18\b/i.test(p.titulo)).map(p=>p.codigo).sort(),iphoneCodes);
    for(const code of ['1219463','1204612'])if(rows.get(code)?.available===false)assert.ok(!c.productos.some(p=>p.codigo===code),'No publicar el iPhone agotado '+code);
  }
  const iphone=c.productos.find(p=>/^Celular Apple iPhone 18\b/i.test(p.titulo));
  assert.ok(iphone,'El catálogo debe incluir los iPhone 18 de la fuente actual');
  assert.equal(iphone.precio.final_usd,Math.ceil(rows.get(String(iphone.codigo)).usd+70));
  const perfume=c.productos.find(p=>p.catNombre==='Perfumes'&&rows.get(String(p.codigo))?.usd<100&&p.precio.via==='general');
  assert.equal(perfume.precio.precio_unit_usd,Math.ceil(rows.get(String(perfume.codigo)).usd*1.35));
  const hash=()=>createHash('sha256').update(readFileSync('data/catalogo.json')).digest('hex');
  const before=hash(),dir=mkdtempSync(path.join(os.tmpdir(),'fvr-integridad-')),invalid=path.join(dir,'incompleto.json');
  try{writeFileSync(invalid,JSON.stringify({...source,next:'sin terminar'}));const result=spawnSync(process.execPath,['importar-captura-ui.mjs',invalid],{encoding:'utf8'});assert.notEqual(result.status,0);assert.equal(hash(),before);}finally{unlinkSync(invalid);rmdirSync(dir);}
}
console.log(`OK: ${c.total} productos; disponibilidad, precios, envío, pedido guardado y publicación local verificados.`);
