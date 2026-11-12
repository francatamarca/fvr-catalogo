// Lógica del pedido: totales, peso facturable y envío según la TABLA REAL de Via Cargo
// (data/envios.json, cotizada automáticamente: Iguazú -> Jujuy, domicilio+5USD / sucursal+10USD).
export const COMPRA_MINIMA = 300;
export const WHATSAPP_EMPRESA = '543883372745';
// Vía Cargo: caja de 50L y 5kg cotizada en el tramo de 10kg (12/11/2026).
// Superar al peso real por volumen no convierte un paquete compacto en sobredimensionado.
export const VOLUMEN_AUTOMATICO_MAX_CM3 = 50000;

// Revalida pedidos guardados contra el catálogo vigente sin perder sus cantidades.
export function reconciliarPedido(items, vigentes) {
  const index = new Map(vigentes.map(([codigo, via, precioUnit, m25, pesoKg, vol]) =>
    [String(codigo), { codigo:String(codigo), via, precioUnit, m25, pesoKg, vol }]));
  const actualizados = items.filter(it => index.has(String(it.codigo)) && it.qty > 0)
    .map(it => ({ ...it, ...index.get(String(it.codigo)) }));
  const cambio = actualizados.length !== items.length || actualizados.some((it,i) =>
    it.precioUnit !== items[i]?.precioUnit || it.via !== items[i]?.via);
  return { items:actualizados, cambio };
}

// tramos de respaldo por si la tabla no está disponible (se reemplazan por envios.tabla)
const TABLA_FALLBACK = [
  { kg: 5, usd: 18 }, { kg: 10, usd: 25 }, { kg: 15, usd: 30 },
];

export function calcCarrito(items, envios = null) {
  const divisor = envios?.divisor_volumetrico || 5000;
  const tabla = (envios?.tabla?.length ? envios.tabla : TABLA_FALLBACK);
  const maxKg = tabla[tabla.length - 1].kg;
  const fijoLiviano = it => it.via === 'fija' && it.pesoKg > 0 && it.pesoKg < 10
    && Math.max(it.pesoKg, (it.vol || 0) / divisor) < 10;
  // Un envío incluido liviano habilita la bonificación del pedido combinado.
  // Sus unidades ocupan parte de los 10kg; los fijos pesados mantienen su logística propia.
  const generalLista = items.filter(it=>it.via!=='fija').reduce((n,it)=>n+it.precioUnit*it.qty,0);
  // Si los generales ya llegan a500, conservan su beneficio anterior sin sumar el peso prepagado.
  const bonificacionPorIncluido = generalLista > 0 && generalLista < 500 && items.some(fijoLiviano);

  let subFija = 0, subGen = 0, peso = 0, pesoEstimado = false, unidades = 0, porVolumen = false, bultoPesado = false;
  let volumenTotal = 0, pesoReal = 0, pesoRealPendiente = false;
  for (const it of items) {
    const st = it.precioUnit * it.qty;
    unidades += it.qty;
    if (it.via === 'fija') {
      subFija += st;
      if (!bonificacionPorIncluido || !fijoLiviano(it)) continue;
    } else subGen += st;
    // Estimación para detectar bultos voluminosos; el divisor no sustituye la cotización por medidas.
    const volKg = it.vol ? it.vol / divisor : 0;
    if (volKg > (it.pesoKg ?? 0)) porVolumen = true;
    volumenTotal += (it.vol || 0) * it.qty;
    pesoReal += (it.pesoKg || 0) * it.qty;
    if (!(it.pesoKg > 0)) pesoRealPendiente = true;
    if ((it.pesoKg ?? 0) > (envios?.max_peso_bulto_kg ?? 50)) bultoPesado = true;
    let fact = Math.max(it.pesoKg ?? 0, volKg);
    if (!fact) pesoEstimado = true; // sin datos publicados: el envío requiere confirmación
    peso += fact * it.qty;
  }
  peso = Math.ceil((peso - 1e-9) * 100) / 100; // no bajar de tramo por redondear gramos
  pesoReal = Math.round(pesoReal * 1000) / 1000;
  const voluminoso = porVolumen && volumenTotal > VOLUMEN_AUTOMATICO_MAX_CM3;

  // Descuento pedido +US$1000: los productos SIN tarifa fija pasan del 35% al 25% de margen.
  // (los que ya vienen con 25% por unidad no descuentan doble)
  let descuento1000 = 0;
  const UMBRAL_1000 = 1000;
  if (subGen >= UMBRAL_1000) { // desde US$1000 inclusive
    let base35 = 0;
    for (const it of items) if (it.via !== 'fija' && !it.m25) base35 += it.precioUnit * it.qty;
    descuento1000 = Math.round(base35 * 10 / 135); // 35% -> 25% sobre el costo base
  }
  const falta1000 = subGen >= UMBRAL_1000 ? 0 : Math.ceil(UMBRAL_1000 - subGen);
  const subtotalBruto = subFija + subGen;
  const subtotal = subtotalBruto - descuento1000;

  const precioTramo = (kg) => (tabla.find(t => kg <= t.kg) || tabla[tabla.length - 1]).usd;

  let envio = 0, envioTxt = 'Incluido en los productos', consultar = false, gratis = false, descuentoEnvio = 0;
  if (subGen > 0) {
    if (voluminoso) { consultar = true; envioTxt = 'A cotizar por medidas (bulto voluminoso)'; }
    else if (bultoPesado) { consultar = true; envioTxt = 'A confirmar (bulto de más de 50 kg)'; }
    else if (pesoEstimado) { consultar = true; envioTxt = 'A confirmar (falta peso del producto)'; }
    else if (peso > maxKg) { consultar = true; envioTxt = 'A cotizar (pedido muy pesado)'; }
    else if (subGen >= 500 || bonificacionPorIncluido) {
      if (peso <= 10) { gratis = true; envioTxt = bonificacionPorIncluido ? 'GRATIS (producto con envío incluido)' : 'GRATIS (compra supera US$500)'; }
      else {
        // compra ≥US$500 pero pesa más de 10kg: los primeros 10kg van gratis,
        // se cobra solo la diferencia respecto del tramo de 10kg
        const completo = precioTramo(peso);
        descuentoEnvio = precioTramo(10);
        envio = Math.max(0, completo - descuentoEnvio);
        envioTxt = `US$ ${envio}`;
      }
    } else {
      envio = precioTramo(peso);
      envioTxt = `US$ ${envio}`;
    }
  }
  const total = subtotal + envio;
  const faltaMinimo = Math.max(0, COMPRA_MINIMA - subtotal);
  // para los avisos de incentivo del carrito
  const falta500 = subGen > 0 && !bonificacionPorIncluido ? Math.max(0, Math.ceil(500 - subGen)) : 0;
  const bonif10 = precioTramo(10); // lo que vale el beneficio "10 kg de envío gratis"
  return {
    subFija, subGen, subtotalBruto, subtotal, peso, pesoReal, pesoRealPendiente, pesoEstimado, porVolumen, voluminoso, volumenTotal, bultoPesado, unidades,
    envio, envioTxt, consultar, gratis, descuentoEnvio, bonificacionPorIncluido,
    descuento1000, falta1000, falta500, bonif10,
    total, minimoOk: subtotal >= COMPRA_MINIMA, faltaMinimo,
  };
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
  l.push(`Subtotal (${tot.unidades} ${tot.unidades === 1 ? 'producto' : 'productos'}): *${usdFmt(tot.subtotalBruto)}*`);
  if (tot.descuento1000 > 0) l.push(`🎉 Descuento pedido +US$1000: −${usdFmt(tot.descuento1000)}`);
  if (tot.subGen > 0) {
    if(tot.porVolumen&&!tot.pesoRealPendiente)l.push(`Peso real informado: ${tot.pesoReal.toLocaleString('es-AR')} kg`);
    l.push(tot.pesoEstimado ? 'Peso: a confirmar (faltan datos de uno o más productos)' : `${tot.porVolumen ? 'Peso para envío (incluye volumen)' : 'Peso'}: ${tot.peso.toLocaleString('es-AR')} kg`);
  }
  l.push(`Envío nacional: ${tot.consultar ? `⚠️ ${tot.envioTxt}` : tot.gratis ? '🎁 GRATIS' : tot.envio > 0 ? usdFmt(tot.envio) : 'incluido en los productos'}`);
  if (tot.descuentoEnvio > 0) l.push(`🎁 Descuento en envío aplicado: −${usdFmt(tot.descuentoEnvio)} (primeros 10 kg gratis ${tot.bonificacionPorIncluido ? 'por producto con envío incluido' : 'por compra +US$500'})`);
  l.push(`💵 *TOTAL: ${usdFmt(tot.total)}${tot.consultar ? ' + envío a cotizar' : ''}* (en USDT)`);
  if (rate) l.push(`≈ $${Math.round(tot.total * rate).toLocaleString('es-AR')} pesos al valor del USDT de hoy`);
  l.push('');
  l.push('Quiero confirmar este pedido ✅');
  return l.join('\n');
}

export function linkPedidoWhatsApp(items, tot, rate) {
  return `https://wa.me/${WHATSAPP_EMPRESA}?text=${encodeURIComponent(mensajePedido(items, tot, rate))}`;
}
