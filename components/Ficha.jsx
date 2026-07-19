'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRate } from './RateContext';
import { priceView, ars, usd } from '../lib/format';

export default function Ficha({ p }) {
  const rate = useRate();
  const pv = priceView(p);
  const imgs = [p.img, ...(p.imgs || [])].filter(Boolean);
  const [main, setMain] = useState(imgs[0] || null);
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
          {rate ? <div style={{ color: 'var(--muted)', marginTop: 2, fontSize: 14 }}>{ars(pv.main, rate)} <span style={{ fontSize: 12 }}>(al dólar cripto de hoy)</span></div> : null}

          <div className="card-info">
            {(() => {
              const gratis = esGeneral && !p.precio.flete_consultar && p.precio.precio_unit_usd >= 400;
              const verde = !esGeneral || gratis;
              return <div className="row"><span className="k">Envío nacional</span><span className="v" style={{ color: verde ? 'var(--green)' : 'inherit' }}>
                {p.precio.via === 'fija' ? 'Incluido hasta tu ciudad ✓'
                  : p.precio.flete_consultar ? 'A consultar (+15kg)'
                  : gratis ? 'Gratis ✓ (supera US$400)'
                  : `+ ${usd(p.precio.flete_usd)}`}
              </span></div>;
            })()}
            {esGeneral && p.precio.combo && p.precio.precio_unit_usd < 400 && !p.precio.flete_consultar ? (
              <div className="row"><span className="k">Combo envío gratis 🚚</span><span className="v" style={{ color: 'var(--accent-dark)' }}>{p.precio.combo.unidades} u (US$400)</span></div>
            ) : null}
            {esGeneral && p.precio.precio_unit_usd < 400 ? (
              <div className="row"><span className="k">Envío gratis desde</span><span className="v">US$ 400</span></div>
            ) : null}
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
