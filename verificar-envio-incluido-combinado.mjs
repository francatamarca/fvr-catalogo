import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {calcCarrito,mensajePedido} from './lib/cart.js';
const c=JSON.parse(gunzipSync(fs.readFileSync('data/catalogo.public.json.gz')));
const item=(precioUnit,pesoKg,extra={})=>({titulo:'Artículo',via:'general',precioUnit,pesoKg,qty:1,vol:null,...extra});
const fija=(pesoKg,extra={})=>item(560,pesoKg,{via:'fija',...extra});
const calc=items=>calcCarrito(items,c.envios);
const tramo=kg=>c.envios.tabla.find(t=>kg<=t.kg).usd;
const from=code=>{const p=c.productos.find(p=>p.codigo===code);assert.ok(p);return {...p,via:p.precio.via,precioUnit:p.precio.final_usd??p.precio.precio_unit_usd,qty:1};};
const real=calc([from('1220582'),from('1077926')]);
assert.equal(real.subtotal,563);assert.equal(real.total,563);assert.equal(real.gratis,true);assert.equal(real.consultar,false);
assert.equal(real.pesoReal,2.748);assert.equal(real.peso,4.19);assert.equal(real.falta500,0);
assert.equal(real.descuento1000,0);assert.equal(real.falta1000,997);
assert.equal(calc([fija(2),item(3,1)]).gratis,true); // sin exigir US$500
assert.equal(calc([fija(2),item(3,8)]).gratis,true); // exactamente 10kg combinados
const exceso=calc([fija(2),item(3,8.001)]);
assert.equal(exceso.gratis,false);assert.equal(exceso.envio,tramo(10.01)-tramo(10));
assert.match(mensajePedido([],exceso,null),/por producto con envío incluido/);
assert.doesNotMatch(mensajePedido([],exceso,null),/por compra \+US\$500/);
assert.equal(calc([fija(2,{qty:2}),item(3,7)]).envio,tramo(11)-tramo(10));
assert.equal(calc([fija(10),item(3,1)]).bonificacionPorIncluido,false);
assert.equal(calc([fija(12),item(3,1)]).envio,tramo(1));
assert.equal(calc([fija(null),item(3,1)]).bonificacionPorIncluido,false); // no inventar un peso
assert.equal(calc([fija(1,{vol:60000}),item(3,1)]).bonificacionPorIncluido,false);
assert.equal(calc([fija(12)]).envio,0); // su envío incluido permanece
assert.equal(calc([fija(2),fija(12)]).envio,0);
assert.equal(calc([fija(2),item(3,null)]).consultar,true);
assert.equal(calc([fija(2),item(3,2,{vol:60000})]).consultar,true);
assert.equal(calc([fija(12),item(500,5)]).gratis,true); // regla anterior de generales
assert.equal(calc([fija(2),item(500,9)]).gratis,true); // la regla nueva no quita un beneficio obtenido
assert.equal(calc([fija(12),item(500,12)]).envio,tramo(12)-tramo(10));
assert.equal(calc([item(499,1)]).envio,tramo(1));
assert.equal(calc([item(500,1)]).gratis,true);
assert.equal(calc([fija(2),item(1000,1)]).descuento1000,74); // sólo generales
assert.equal(calc([fija(2,{precioUnit:150}),item(149,1)]).minimoOk,false);
assert.equal(calc([fija(2,{precioUnit:150}),item(150,1)]).minimoOk,true);
console.log('OK: pedido real US$563 gratis; combinación, cantidades, 10kg exactos/exceso, fijos pesados, faltantes, mínimo y mayorista.');
