// Lógica del pedido: totales, peso facturable y envío según la TABLA REAL de Via Cargo
// (data/envios.json, cotizada automáticamente: Iguazú -> Jujuy, domicilio+5USD / sucursal+10USD).
export const COMPRA_MINIMA = 250;

// tramos de respaldo por si la tabla no está disponible (se reemplazan por envios.tabla)
const TABLA_FALLBACK = [
  { kg: 5, usd: 18 }, { kg: 10, usd: 25 }, { kg: 15, usd: 30 },
];

export function calcCarrito(items, envios = null) {
  const divisor = envios?.divisor_volumetrico || 5000;
  const tabla = (envios?.tabla?.length ? envios.tabla : TABLA_FALLBACK);
  const maxKg = tabla[tabla.length - 1].kg;

  let subFija = 0, subGen = 0, peso = 0, pesoEstimado = false, unidades = 0;
  for (const it of items) {
    const st = it.precioUnit * it.qty;
    unidades += it.qty;
    if (it.via === 'fija') { subFija += st; continue; } // logística incluida en el precio
    subGen += st;
    // peso facturable: el mayor entre real y volumétrico (Via Cargo)
    const volKg = it.vol ? it.vol / divisor : 0;
    let fact = Math.max(it.pesoKg ?? 0, volKg);
    if (!fact) { fact = 1; pesoEstimado = true; } // sin datos -> estimar 1kg
    peso += fact * it.qty;
  }
  peso = Math.round(peso * 100) / 100;
  const subtotal = subFija + subGen;

  let envio = 0, envioTxt = 'Incluido en los productos', consultar = false, gratis = false;
  if (subGen > 0) {
    if (subGen >= 500 && peso <= 10) { gratis = true; envioTxt = 'GRATIS (compra supera US$500)'; }
    else if (peso > maxKg) { consultar = true; envioTxt = 'A cotizar (pedido muy pesado)'; }
    else {
      const tramo = tabla.find(t => peso <= t.kg) || tabla[tabla.length - 1];
      envio = tramo.usd;
      envioTxt = `US$ ${envio}`;
    }
  }
  const total = subtotal + envio;
  const faltaMinimo = Math.max(0, COMPRA_MINIMA - subtotal);
  return { subFija, subGen, subtotal, peso, pesoEstimado, unidades, envio, envioTxt, consultar, gratis, total, minimoOk: subtotal >= COMPRA_MINIMA, faltaMinimo };
}

const usdFmt = n => `US$ ${Number(n).toLocaleString('es-AR')}`;

export function mensajePedido(items, tot, rate) {
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const l = [];
  l.push('🛒 *PEDIDO — Catálogo FVR*');
  l.push(`📅 ${fecha}`);
  l.push('─────────────────');
  for (const it of items) {
    const nombre = it.titulo.length > 60 ? it.titulo.slice(0, 57) + '…' : it.titulo;
    if (it.qty > 1) l.push(`▪ ${it.qty}× ${nombre}\n   ${usdFmt(it.precioUnit)} c/u = *${usdFmt(it.precioUnit * it.qty)}*  (cod. ${it.codigo})`);
    else l.push(`▪ 1× ${nombre}\n   *${usdFmt(it.precioUnit)}*  (cod. ${it.codigo})`);
  }
  l.push('─────────────────');
  l.push(`Subtotal (${tot.unidades} ${tot.unidades === 1 ? 'producto' : 'productos'}): *${usdFmt(tot.subtotal)}*`);
  if (tot.subGen > 0) l.push(`Peso${tot.pesoEstimado ? ' aprox.' : ''}: ${tot.peso.toLocaleString('es-AR')} kg`);
  l.push(`Envío nacional: ${tot.consultar ? '⚠️ a cotizar (pedido muy pesado)' : tot.gratis ? '🎁 GRATIS' : tot.envio > 0 ? usdFmt(tot.envio) : 'incluido en los productos'}`);
  l.push(`💵 *TOTAL: ${usdFmt(tot.total)}${tot.consultar ? ' + envío a cotizar' : ''}* (en USDT)`);
  if (rate) l.push(`≈ $${Math.round(tot.total * rate).toLocaleString('es-AR')} pesos al valor del USDT de hoy`);
  l.push('');
  l.push('Quiero confirmar este pedido ✅');
  return l.join('\n');
}
