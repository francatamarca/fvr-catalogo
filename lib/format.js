export const usd = n => (n == null ? '—' : `US$ ${Number(n).toLocaleString('es-AR')}`);
export const ars = (n, rate) => (rate ? `≈ $${Math.round(n * rate).toLocaleString('es-AR')}` : '');

// Vista de precio para tarjetas/fichas. El precio del envío NO se muestra por producto:
// se calcula en el pedido (carrito) según el peso total.
export function priceView(p) {
  const pr = p.precio;
  if (pr.via === 'fija') {
    return { main: pr.final_usd, unit: '', note: '🚚 Envío incluido hasta tu ciudad', noteClass: 'incl' };
  }
  const unit = pr.precio_unit_usd;
  // Un producto de ≥US$1000 ya activa solo el descuento de pedido +US$1000:
  // mostrar el precio final desde el catálogo (tachando el de lista).
  if (!pr.m25 && unit >= 1000) {
    const desc = Math.round(unit * 10 / 135);
    return { main: unit - desc, old: unit, unit: '/u', note: 'Envío se calcula en tu pedido', noteClass: 'plus', mayor: true };
  }
  return { main: unit, unit: '/u', note: 'Envío se calcula en tu pedido', noteClass: 'plus' };
}
