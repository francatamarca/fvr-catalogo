'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const RateContext = createContext(null);
export const useRate = () => useContext(RateContext);

export function RateProvider({ children }) {
  const [rate, setRate] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      // 1) valor agregado del dólar cripto (CriptoYa) — el más fiel al valor real del momento
      try {
        const r = await fetch('https://criptoya.com/api/dolar');
        const j = await r.json();
        const v = j?.cripto?.usdt?.ask;
        if (alive && typeof v === 'number' && v > 0) { setRate(v); return; }
      } catch {}
      // 2) respaldo: MEDIANA de los exchanges (nunca el mínimo: un P2P desactualizado rompe el valor)
      try {
        const r = await fetch('https://criptoya.com/api/usdt/ars/1');
        const j = await r.json();
        const vals = Object.values(j).map(v => v?.totalAsk || v?.ask).filter(n => typeof n === 'number' && n > 0).sort((a, b) => a - b);
        if (alive && vals.length) setRate(vals[Math.floor(vals.length / 2)]);
      } catch {}
    };
    load();
    const id = setInterval(load, 60000); // refresca cada 60 segundos
    return () => { alive = false; clearInterval(id); };
  }, []);
  return <RateContext.Provider value={rate}>{children}</RateContext.Provider>;
}
