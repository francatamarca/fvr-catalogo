'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const RateContext = createContext(null);
export const useRate = () => useContext(RateContext);

export function RateProvider({ children }) {
  const [rate, setRate] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('https://criptoya.com/api/usdt/ars/1');
        const j = await r.json();
        const vals = Object.values(j).map(v => v?.totalAsk || v?.ask).filter(n => typeof n === 'number' && n > 0);
        if (alive && vals.length) setRate(Math.min(...vals)); // cotización más conveniente
      } catch {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return <RateContext.Provider value={rate}>{children}</RateContext.Provider>;
}
