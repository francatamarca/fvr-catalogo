// Motor de precios FVR — spec confirmada con Francisco (2026-07)
// Toma SOLO el precio USD de Madrid Center y devuelve el precio FVR final.

const ceil = n => Math.ceil(n);

// ---- Detección de categoría con logística FIJA (por unidad, incluye envío a la ciudad) ----
function categoriaFija(cat = '', marca = '') {
  const c = cat.toLowerCase();
  if (c.includes('notebook')) return 'notebook';
  if (c.includes('tablet') || c.includes('ipad')) return 'tablet';
  if (c.includes('celular') || c.includes('smartphone')) return 'celular';
  return null;
}

// ---- Flete nacional Via Cargo por peso total (productos generales) ----
export function fleteNacional(pesoKg) {
  if (pesoKg == null || isNaN(pesoKg)) return { usd: 18, estimado: true }; // sin peso -> asumo liviano, marcar
  if (pesoKg <= 5) return { usd: 18, estimado: false };
  if (pesoKg <= 10) return { usd: 25, estimado: false };
  if (pesoKg <= 15) return { usd: 30, estimado: false };
  return { usd: null, consultar: true }; // >15kg -> consultar en Via Cargo
}

// ---- Logística fija por unidad según categoría ----
function logisticaFija(tipo, usd, marca = '') {
  const esApple = marca.toLowerCase().includes('apple');
  if (tipo === 'notebook' || tipo === 'tablet') {
    if (usd > 2000) return 200;      // alta gama
    if (usd > 1000) return 150;
    if (usd >= 500) return 130;
    return 110;                      // < 500 USD -> flete más barato para competir con AR
  }
  if (tipo === 'celular') {
    if (esApple || usd > 600) return 70; // alta gama / iPhone
    return 50;
  }
  return null;
}

/**
 * Calcula el precio FVR de un producto.
 * @param {{usd:number, categoria:string, marca:string, pesoKg:number|null, recargo?:number}} p
 * @returns objeto con el precio final y metadata para mostrar / decidir si aparece.
 */
export function precioFVR(p) {
  const { usd, categoria = '', marca = '', pesoKg = null, recargo = 0 } = p;
  const tipoFijo = categoriaFija(categoria, marca);

  if (tipoFijo) {
    // VÍA B — precio fijo por unidad, envío incluido, SIN combos
    const fija = logisticaFija(tipoFijo, usd, marca);
    const final = ceil(usd + fija + recargo);
    const altaGama = (tipoFijo === 'celular')
      ? (marca.toLowerCase().includes('apple') || usd > 600)
      : usd > 2000;
    return {
      via: 'fija',
      tipo: tipoFijo,
      base_usd: usd,
      logistica_usd: fija,
      alta_gama: altaGama,
      envio_incluido: true,
      final_usd: final,       // precio por unidad, todo incluido hasta la ciudad
      combo: null,
    };
  }

  // VÍA A — general. Margen 35%, salvo productos de más de US$1000 que pesen menos de 10kg
  // (ej: drones DJI) -> 25%. El envío se calcula en el CARRITO por peso total.
  const margen = (usd > 1000 && pesoKg != null && pesoKg < 10) ? 1.25 : 1.35;
  const unitCeil = ceil(usd * margen + recargo);

  return {
    via: 'general',
    base_usd: usd,
    margen: margen === 1.25 ? '+25%' : '+35%',
    recargo_usd: recargo || 0,
    precio_unit_usd: unitCeil,
    peso_kg: pesoKg,
    envio_gratis_desde: 500,
  };
}
