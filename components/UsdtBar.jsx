'use client';
import { useRate } from './RateContext';

export default function UsdtBar() {
  const rate = useRate();
  return (
    <div className="usdt-bar">
      Precios en <b>USDT</b> · Binance vía CriptoYa · {rate
        ? <>1 USDT = <b>{rate.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} ARS</b></>
        : 'Cotización en pesos pendiente'}
    </div>
  );
}
