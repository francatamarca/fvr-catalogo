'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const RateContext = createContext(null);
export const useRate = () => useContext(RateContext);

export function RateProvider({ children }) {
  const [rate, setRate] = useState(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      let price = null;
      try {
        const response = await fetch('https://criptoya.com/api/binance/usdt/ars/500', {
          signal: AbortSignal.timeout(12000),
          cache: 'no-store',
        });
        if (response.ok) {
          const { totalAsk, time } = await response.json();
          const age = Date.now() - time * 1000;
          if (Number.isFinite(totalAsk) && totalAsk > 0 && age >= -60000 && age <= 300000) {
            price = totalAsk;
          }
        }
      } catch {
        // Ante una lectura fallida se muestran únicamente los importes en USDT.
      }
      if (alive) setRate(price);
    }
    load();
    const timer = setInterval(load, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return <RateContext.Provider value={rate}>{children}</RateContext.Provider>;
}
