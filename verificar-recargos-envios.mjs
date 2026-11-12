import assert from 'node:assert/strict';
import fs from 'node:fs';
import {importeARS,leerCotizacion,tarifaUSD} from './lib/envios.js';
import {precioFVR} from './pricing.mjs';
import {recargoPara} from './config.mjs';
import {calcCarrito,mensajePedido} from './lib/cart.js';
for(const [s,n] of [['65999.99',65999.99],['65.999,99',65999.99],['$30.000',30000],['30000',30000],['124999.99',124999.99],['',null]])assert.equal(importeARS(s),n);
const quote=leerCotizacion('ENTREGA DOMICILIO\nHasta 50kg\nValor\n$65999.99\nENTREGA AGENCIA\nValor\n$52000');
assert.deepEqual(quote,{dom:65999.99,suc:52000});
assert.equal(tarifaUSD(quote.dom,quote.suc,1668.15),45);
assert.equal(tarifaUSD(null,52000,1668.15),42);
assert.throws(()=>tarifaUSD(null,null,1668.15));
const precio=(titulo,categoria='Celulares y SmartPhones',usd=1000,marca='APPLE')=>precioFVR({usd,titulo,categoria,marca,recargo:recargoPara(titulo,categoria)});
assert.equal(precio('Celular Apple iPhone 18 Pro Max').final_usd,1150);
assert.equal(precio('Celular Apple iPhone 17 Pro').final_usd,1080);
assert.equal(precio('Celular Apple iPhone 16').final_usd,1070);
assert.equal(precio('Celular Samsung',undefined,600,'SAMSUNG').final_usd,650);
assert.equal(precio('Celular Samsung',undefined,601,'SAMSUNG').final_usd,671);
assert.equal(precio('Microondas 20 litros','Electrodomésticos',100,'MIDEA').precio_unit_usd,155);
assert.equal(precio('Funda para iPhone 18','Accesorios y Periféricos',10).precio_unit_usd,14);
for(const [usd,extra] of [[499,110],[500,130],[1000,130],[1001,150],[2000,150],[2001,200]])assert.equal(precio('Notebook','Notebook',usd,'LENOVO').final_usd,usd+extra);
assert.equal(precio('Consola PlayStation 5','Gamer',500,'SONY').final_usd,610);
const shipping=JSON.parse(fs.readFileSync('data/envios.json'));
assert.equal(shipping.tabla.length,14);
for(const t of shipping.tabla)assert.equal(t.usd,tarifaUSD(t.ars_dom,t.ars_suc,shipping.usdt));
const item=(extra={})=>({via:'general',precioUnit:600,qty:1,pesoKg:5,vol:null,...extra});
for(const precioUnit of [300,600,1100]){
  const bulky=calcCarrito([item({vol:125000,precioUnit})],shipping);
  assert.equal(bulky.consultar,true);assert.equal(bulky.gratis,false);assert.equal(bulky.envio,0);
  assert.match(bulky.envioTxt,/medidas/);assert.match(mensajePedido([],bulky,null),/envío a cotizar/);
}
assert.equal(calcCarrito([item({vol:1000})],shipping).gratis,true);
assert.equal(calcCarrito([item({pesoKg:51})],shipping).bultoPesado,true);
assert.equal(calcCarrito([item({pesoKg:51})],shipping).consultar,true);
assert.equal(calcCarrito([item({pesoKg:30,qty:2})],shipping).consultar,false);
assert.equal(calcCarrito([item({pesoKg:30,qty:3})],shipping).consultar,true);
assert.equal(calcCarrito([item({via:'fija',vol:125000,pesoKg:55})],shipping).consultar,false);
if(process.argv[2]){
  const antes=JSON.parse(fs.readFileSync(process.argv[2]));
  const despues=JSON.parse(fs.readFileSync('data/catalogo.json'));
  const index=new Map(antes.productos.map(p=>[String(p.codigo),p]));
  assert.equal(antes.productos.length,despues.productos.length);
  assert.equal(antes.generado,despues.generado);assert.equal(antes.stockRevisado,despues.stockRevisado);
  const unit=p=>p.precio.final_usd??p.precio.precio_unit_usd;
  let iphones18=0,microondas=0;
  for(const p of despues.productos){
    const viejo=index.get(String(p.codigo));assert.ok(viejo);
    const sinPrecio=({precio,descuento,...x})=>x;
    assert.deepEqual(sinPrecio(p),sinPrecio(viejo),'No cambiar datos/stock '+p.codigo);
    if(/^Celular Apple iPhone 18\b/i.test(p.titulo)){assert.equal(unit(p),Math.ceil(p.madridUSD+150));assert.equal(unit(p)-unit(viejo),80);iphones18++;}
    else if(/microond/i.test(p.categoria)||/microondas/i.test(p.titulo)){assert.equal(unit(p)-unit(viejo),9);microondas++;}
    else assert.equal(unit(p),unit(viejo),'Precio ajeno al pedido modificado '+p.codigo);
  }
  assert.ok(iphones18>0&&microondas>0);
  console.log(JSON.stringify({iphones18,microondas,otrosPreciosSinCambio:despues.productos.length-iphones18-microondas}));
}
console.log('OK: recargos, lectura de centavos, 14 tarifas, volumen, límites y beneficios de envío.');
