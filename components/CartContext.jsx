'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { reconciliarPedido } from '../lib/cart';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = 'fvr-pedido-v1';

export function CartProvider({ children, envios = null, vigentes = null }) {
  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);
  const [pedidoActualizado, setPedidoActualizado] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) {
        const r = vigentes ? reconciliarPedido(saved,vigentes) : {items:saved,cambio:false};
        setItems(r.items); setPedidoActualizado(r.cambio);
      }
    } } catch {}
    setListo(true);
  }, [vigentes]);
  useEffect(() => {
    if (listo) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} }
  }, [items, listo]);

  const agregar = useCallback((p, qty = 1) => {
    setItems(prev => {
      const i = prev.findIndex(x => String(x.codigo) === String(p.codigo));
      const precioUnit = p.precio.via === 'fija' ? p.precio.final_usd : p.precio.precio_unit_usd;
      const actual = { codigo:String(p.codigo), titulo:p.titulo, img:p.img, via:p.precio.via, precioUnit, m25:!!p.precio.m25, pesoKg:p.pesoKg??null, vol:p.vol??null, qty };
      if (i >= 0) { const n=[...prev]; n[i]={...actual,qty:n[i].qty+qty}; return n; }
      return [...prev, actual];
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
    <CartContext.Provider value={{ items, count, agregar, setQty, quitar, vaciar, abierto, setAbierto, envios, pedidoActualizado }}>
      {children}
    </CartContext.Provider>
  );
}
