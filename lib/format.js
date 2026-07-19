export const usd = n => (n == null ? '—' : `US$ ${Number(n).toLocaleString('es-AR')}`);
export const ars = (n, rate) => (rate ? `≈ $${Math.round(n * rate).toLocaleString('es-AR')}` : '');

// Devuelve los datos de precio listos para mostrar en la card / ficha.
export function priceView(p) {
  const pr = p.precio;
  if (pr.via === 'fija') {
    return {
      main: pr.final_usd,
      unit: '',
      note: 'Todo incluido hasta tu ciudad',
      noteClass: 'incl',
      combo: null,
    };
  }
  // general +35%
  const yaGratis = pr.precio_unit_usd >= 400; // 1 unidad ya supera el umbral de envío gratis
  if (pr.flete_consultar) {
    return { main: pr.precio_unit_usd, unit: '/u', note: 'Envío +15kg: a consultar', noteClass: 'plus', combo: null };
  }
  if (yaGratis) {
    return { main: pr.precio_unit_usd, unit: '/u', note: 'Envío gratis ✓', noteClass: 'incl', combo: null };
  }
  return {
    main: pr.precio_unit_usd,
    unit: '/u',
    note: `+ ${usd(pr.flete_usd)} envío${pr.flete_estimado ? '*' : ''}`,
    noteClass: 'plus',
    combo: pr.combo ? `Combo ${pr.combo.unidades}u: envío gratis 🚚` : null,
  };
}
