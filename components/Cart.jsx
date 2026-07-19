'use client';
import { useState } from 'react';
import { useCart } from './CartContext';
import { useRate } from './RateContext';
import { calcCarrito, mensajePedido, COMPRA_MINIMA } from '../lib/cart';

export default function Cart() {
  const { items, count, setQty, quitar, vaciar, abierto, setAbierto } = useCart();
  const rate = useRate();
  const [copiado, setCopiado] = useState(false);
  const tot = calcCarrito(items);

  const copiar = async () => {
    const msg = mensajePedido(items, tot, rate);
    try {
      await navigator.clipboard.writeText(msg);
      setCopiado(true); setTimeout(() => setCopiado(false), 2600);
    } catch {}
  };
  const compartir = async () => {
    const msg = mensajePedido(items, tot, rate);
    try {
      if (navigator.share) await navigator.share({ text: msg });
      else await copiar();
    } catch {}
  };

  return (
    <>
      <button className="cart-fab" onClick={() => setAbierto(true)} aria-label="Ver mi pedido">
        🛒{count > 0 && <span className="cart-count">{count}</span>}
      </button>

      {abierto && (
        <div className="cart-overlay" onClick={() => setAbierto(false)}>
          <div className="cart-panel" onClick={e => e.stopPropagation()}>
            <div className="cart-head">
              <div className="cart-title">🛒 Mi pedido {count > 0 ? <span className="cart-n">({count})</span> : null}</div>
              <button className="cart-close" onClick={() => setAbierto(false)}>×</button>
            </div>

            {items.length === 0 ? (
              <div className="cart-empty">
                <div style={{ fontSize: 38 }}>🛒</div>
                Tu pedido está vacío.<br />Agregá productos con el botón <b>“+ Agregar”</b>.
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {items.map(it => (
                    <div className="cart-item" key={it.codigo}>
                      {it.img ? <img src={it.img} alt="" /> : <div className="cart-noimg" />}
                      <div className="cart-info">
                        <div className="cart-name">{it.titulo}</div>
                        <div className="cart-unit">US$ {it.precioUnit.toLocaleString('es-AR')} c/u{it.via === 'fija' ? ' · envío incluido' : ''}</div>
                        <div className="cart-qtyrow">
                          <button className="qty-btn" onClick={() => setQty(it.codigo, it.qty - 1)}>−</button>
                          <span className="qty-num">{it.qty}</span>
                          <button className="qty-btn" onClick={() => setQty(it.codigo, it.qty + 1)}>+</button>
                          <button className="cart-del" onClick={() => quitar(it.codigo)}>Quitar</button>
                        </div>
                      </div>
                      <div className="cart-line">US$ {(it.precioUnit * it.qty).toLocaleString('es-AR')}</div>
                    </div>
                  ))}
                </div>

                <div className="cart-totals">
                  <div className="trow"><span>Subtotal ({tot.unidades} u.)</span><b>US$ {tot.subtotal.toLocaleString('es-AR')}</b></div>
                  {tot.subGen > 0 && <div className="trow"><span>Peso{tot.pesoEstimado ? ' aprox.' : ''}</span><b>{tot.peso.toLocaleString('es-AR')} kg</b></div>}
                  <div className="trow"><span>Envío nacional</span><b style={{ color: tot.gratis || tot.subGen === 0 ? 'var(--green)' : tot.consultar ? 'var(--accent-dark)' : 'inherit' }}>{tot.envioTxt}</b></div>
                  <div className="trow total"><span>TOTAL</span><b>US$ {tot.total.toLocaleString('es-AR')}{tot.consultar ? ' + envío' : ''}</b></div>
                  {rate ? <div className="trow ars"><span>≈ en pesos hoy</span><span>${Math.round(tot.total * rate).toLocaleString('es-AR')}</span></div> : null}
                </div>

                {!tot.minimoOk ? (
                  <div className="cart-min">⚠️ La compra mínima es <b>US$ {COMPRA_MINIMA}</b> — te faltan US$ {tot.faltaMinimo.toLocaleString('es-AR')}.</div>
                ) : (
                  <div className="cart-ok">✅ Listo para enviar: copiá el pedido y pegalo en el WhatsApp de tu vendedor FVR.</div>
                )}

                <div className="cart-actions">
                  <button className="btn-copy" disabled={!tot.minimoOk} onClick={copiar}>
                    {copiado ? '✓ ¡Pedido copiado!' : '📋 Copiar pedido'}
                  </button>
                  <button className="btn-share" disabled={!tot.minimoOk} onClick={compartir}>📤 Compartir</button>
                </div>
                <button className="cart-clear" onClick={vaciar}>Vaciar pedido</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
