'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRate } from './RateContext';
import { useCart } from './CartContext';
import { priceView, ars } from '../lib/format';

export default function Ficha({ p }) {
  const rate = useRate();
  const { agregar } = useCart();
  const pv = priceView(p);
  const imgs = [p.img, ...(p.imgs || [])].filter(Boolean);
  const [main, setMain] = useState(imgs[0] || null);
  const [qty, setQty] = useState(1);
  const [copiado, setCopiado] = useState(false);
  const esGeneral = p.precio.via === 'general';

  const compartir = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: p.titulo, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  return (
    <div className="container">
      <Link href="/" className="back">← Volver al catálogo</Link>
      <div className="pd">
        <div>
          <div className="gallery">
            {main ? <img src={main} alt={p.titulo} /> : <div style={{ color: '#ccc' }}>sin imagen</div>}
          </div>
          {imgs.length > 1 && (
            <div className="thumbs">
              {imgs.map((src, i) => <img key={i} src={src} alt="" onClick={() => setMain(src)} style={{ borderColor: src === main ? 'var(--accent)' : undefined }} />)}
            </div>
          )}
        </div>

        <div>
          <div className="catlink">{p.catEmoji} {p.catNombre} · {p.marca}</div>
          <h1>{p.titulo}</h1>

          <div>
            {p.descuento ? <span className="badge desc" style={{ display: 'inline-block', marginBottom: 12, marginRight: 8 }}>Oferta -{Math.round(p.descuento)}%</span> : null}
            {p.reacond ? <span className="tag-reacond">🔧 Reacondicionado (no es nuevo)</span> : null}
          </div>

          <div className="bigprice"><span className="cur">US$ </span>{Number(pv.main).toLocaleString('es-AR')}{esGeneral ? <span style={{ fontSize: 16, color: 'var(--muted)' }}> /u</span> : null}</div>
          {rate ? <div style={{ color: 'var(--muted)', marginTop: 2, fontSize: 14 }}>{ars(pv.main, rate)} <span style={{ fontSize: 12 }}>(en pesos, al valor del USDT de hoy)</span></div> : null}

          <div className="buyrow">
            <div className="qty-wrap">
              <button className="qty-btn" onClick={() => setQty(v => Math.max(1, v - 1))}>−</button>
              <span className="qty-num">{qty}</span>
              <button className="qty-btn" onClick={() => setQty(v => v + 1)}>+</button>
            </div>
            <button className="btn-buy" onClick={() => agregar(p, qty)}>🛒 Agregar a mi pedido</button>
          </div>

          <div className="card-info">
            <div className="row"><span className="k">Envío nacional</span><span className="v" style={{ color: esGeneral ? 'inherit' : 'var(--green)' }}>
              {esGeneral ? 'Se calcula en tu pedido según el peso' : 'Incluido hasta tu ciudad ✓'}
            </span></div>
            <div className="row"><span className="k">Compra mínima</span><span className="v">US$ 250 por pedido</span></div>
            <div className="row"><span className="k">Disponibilidad</span><span className="v" style={{ color: 'var(--green)' }}>En stock ✓</span></div>
            {p.pesoKg ? <div className="row"><span className="k">Peso</span><span className="v">{p.pesoKg} kg</span></div> : null}
          </div>

          <button className="share" onClick={compartir}>
            {copiado ? '✓ Link copiado' : '🔗 Compartir este producto'}
          </button>

          {p.specs?.length > 0 && (
            <div className="specs">
              <h3>Especificaciones</h3>
              <div className="card-info">
                {p.specs.map((s, i) => <div className="row" key={i}><span className="k">{s.n}</span><span className="v">{s.v}</span></div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
