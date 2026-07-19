'use client';
import { useRate } from './RateContext';

export default function UsdtBar() {
  const rate = useRate();
  return (
    <div className="usdt-bar">
      <span className="dot">●</span>{' '}
      Precios en <b>USDT</b> · 1 USDT = <b>{rate ? `$${rate.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS` : '...'}</b>
      {' '}· cotización dólar cripto en tiempo real
    </div>
  );
}
