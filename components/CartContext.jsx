'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = 'fvr-pedido-v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
    setListo(true);
  }, []);
  useEffect(() => {
    if (listo) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} }
  }, [items, listo]);

  const agregar = useCallback((p, qty = 1) => {
    setItems(prev => {
      const i = prev.findIndex(x => x.codigo === p.codigo);
      if (i >= 0) { const n = [...prev]; n[i] = { ...n[i], qty: n[i].qty + qty }; return n; }
      const precioUnit = p.precio.via === 'fija' ? p.precio.final_usd : p.precio.precio_unit_usd;
      return [...prev, { codigo: p.codigo, titulo: p.titulo, img: p.img, via: p.precio.via, precioUnit, pesoKg: p.pesoKg ?? null, qty }];
    });
    setAbierto(true);
  }, []);

  const setQty = useCallback((codigo, qty) => {
    setItems(prev => qty <= 0 ? prev.filter(x => x.codigo !== codigo) : prev.map(x => x.codigo === codigo ? { ...x, qty } : x));
  }, []);
  const quitar = useCallback(codigo => setItems(prev => prev.filter(x => x.codigo !== codigo)), []);
  const vaciar = useCallback(() => setItems([]), []);

  const count = items.reduce((a, x) => a + x.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, agregar, setQty, quitar, vaciar, abierto, setAbierto }}>
      {children}
    </CartContext.Provider>
  );
}
