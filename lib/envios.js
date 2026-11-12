// Acepta el decimal del cotizador (65999.99) y el formato argentino (65.999,99).
export function importeARS(value) {
  let s=String(value??'').replace(/[^\d.,]/g,'');
  if(!s) return null;
  if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  const n=Number(s);
  return Number.isFinite(n)&&n>0?n:null;
}

export function leerCotizacion(texto) {
  const bloque=re=>importeARS(texto.match(re)?.[1]);
  return {
    dom:bloque(/ENTREGA DOMICILIO[\s\S]*?\$\s*([\d.,]+)/),
    suc:bloque(/ENTREGA AGENCIA[\s\S]*?\$\s*([\d.,]+)/),
  };
}

export function tarifaUSD(dom,suc,rate) {
  if(!Number.isFinite(rate)||rate<=0) throw Error('Cotización USDT inválida');
  if(Number.isFinite(dom)&&dom>0) return Math.ceil(dom/rate+5);
  if(Number.isFinite(suc)&&suc>0) return Math.ceil(suc/rate+10);
  throw Error('Falta una tarifa válida de Vía Cargo');
}
