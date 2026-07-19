export const usd = n => (n == null ? '—' : `US$ ${Number(n).toLocaleString('es-AR')}`);
export const ars = (n, rate) => (rate ? `≈ $${Math.round(n * rate).toLocaleString('es-AR')}` : '');

// Vista de precio para tarjetas/fichas. El precio del envío NO se muestra por producto:
// se calcula en el pedido (carrito) según el peso total.
export function priceView(p) {
  const pr = p.precio;
  if (pr.via === 'fija') {
    return { main: pr.final_usd, unit: '', note: '🚚 Envío incluido hasta tu ciudad', noteClass: 'incl' };
  }
  return { main: pr.precio_unit_usd, unit: '/u', note: 'Envío se calcula en tu pedido', noteClass: 'plus' };
}
