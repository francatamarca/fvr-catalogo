import {calcCarrito} from './cart.js';
export const usd = n => (n == null ? '—' : `US$ ${Number(n).toLocaleString('es-AR')}`);
export const ars = (n, rate) => (rate ? `≈ $${Math.round(n * rate).toLocaleString('es-AR')}` : '');

// Estimación por producto; el pedido aplica cantidades, peso total y beneficios juntos.
export function notaEnvio(p, envios, qty=1) {
  if(p.precio.via==='fija')return 'Incluido hasta tu ciudad';
  const datos=(p.pesoKg>0)||(p.vol>0);
  if(!datos)return 'A confirmar: falta peso y medidas del proveedor';
  if(!envios)return 'Se calcula en tu pedido';
  const t=calcCarrito([{via:p.precio.via,precioUnit:p.precio.precio_unit_usd,m25:!!p.precio.m25,pesoKg:p.pesoKg,vol:p.vol,qty}],envios);
  if(t.consultar)return t.envioTxt;
  return t.gratis?`Gratis (${qty} u.)`:`Estimado ${usd(t.envio)} (${qty} u.)`;
}

export function priceView(p, envios=null) {
  const pr = p.precio;
  if (pr.via === 'fija') {
    return { main: pr.final_usd, unit: '', note: '🚚 Envío incluido hasta tu ciudad', noteClass: 'incl' };
  }
  const unit = pr.precio_unit_usd;
  const note = `Envío: ${notaEnvio(p,envios)}`;
  // Un producto de ≥US$1000 ya activa solo el descuento de pedido +US$1000:
  // mostrar el precio final desde el catálogo (tachando el de lista).
  if (!pr.m25 && unit >= 1000) {
    const desc = Math.round(unit * 10 / 135);
    return { main: unit - desc, old: unit, unit: '/u', note, noteClass: 'plus', mayor: true };
  }
  return { main: unit, unit: '/u', note, noteClass: 'plus' };
}
