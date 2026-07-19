'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRate } from './RateContext';
import { priceView, ars } from '../lib/format';

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Card({ p, rate }) {
  const pv = priceView(p);
  return (
    <Link href={`/producto/${p.codigo}`} className="card">
      <div className="imgwrap">
        <div className="badges">
          {p.descuento ? <span className="badge desc">-{Math.round(p.descuento)}%</span> : null}
          {p.reacond ? <span className="badge reacond">Reacond.</span> : null}
          {p.repuesto ? <span className="badge repuesto">Repuesto</span> : p.esNuevo ? <span className="badge new">Nuevo</span> : null}
        </div>
        {p.img ? <img src={p.img} alt={p.titulo} loading="lazy" /> : <div style={{ color: '#ccc' }}>sin imagen</div>}
      </div>
      <div className="body">
        <div className="brand">{p.marca}</div>
        <div className="title">{p.titulo}</div>
        <div className="priceblock">
          <div className="price">
            <span className="cur">US$</span>{Number(pv.main).toLocaleString('es-AR')}
            {pv.unit ? <span className="u"> {pv.unit}</span> : null}
          </div>
          {rate ? <div className="price-ars">{ars(pv.main, rate)}</div> : null}
          <div className={`ship-note ${pv.noteClass}`}>{pv.note}</div>
          {pv.combo ? <div className="ship-note combo">{pv.combo}</div> : null}
        </div>
      </div>
    </Link>
  );
}

export default function Tienda({ catalogo }) {
  const rate = useRate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [limit, setLimit] = useState(48);
  useEffect(() => { setLimit(48); }, [q, cat]);

  const tokens = norm(q).split(/\s+/).filter(Boolean);
  const filtrados = useMemo(() => {
    return catalogo.productos.filter(p => {
      if (cat !== 'all' && p.catSlug !== cat) return false;
      if (!tokens.length) return true;
      const hay = norm(`${p.titulo} ${p.marca} ${p.categoria}`);
      return tokens.every(t => hay.includes(t));
    });
  }, [catalogo.productos, cat, q]);

  const buscando = tokens.length > 0;
  const ofertas = (!buscando && cat === 'all') ? catalogo.productos.filter(p => p.descuento) : [];

  return (
    <div className="container">
      <div style={{ paddingTop: 14 }}>
        <div className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            placeholder="Buscar productos… (ej: iphone, notebook, perfume)"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q ? <button className="clear" onClick={() => setQ('')}>×</button> : null}
        </div>
      </div>

      <div className="cats">
        <button className={`chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
          Todo <span className="c">{catalogo.productos.length}</span>
        </button>
        {catalogo.categorias.map(c => (
          <button key={c.slug} className={`chip ${cat === c.slug ? 'active' : ''}`} onClick={() => setCat(c.slug)}>
            {c.emoji} {c.nombre} <span className="c">{c.cantidad}</span>
          </button>
        ))}
      </div>

      {ofertas.length > 0 && (
        <>
          <div className="section-title">🔥 Ofertas del día</div>
          <div className="section-sub">Productos con descuento en Madrid Center, ya con tu precio final.</div>
          <div className="grid">
            {ofertas.slice(0, 12).map(p => <Card key={p.codigo} p={p} rate={rate} />)}
          </div>
        </>
      )}

      <div className="section-title">
        {buscando ? `Resultados para "${q}"` : cat === 'all' ? 'Catálogo completo' : catalogo.categorias.find(c => c.slug === cat)?.nombre}
      </div>
      <div className="section-sub">{filtrados.length} productos</div>

      {filtrados.length === 0 ? (
        <div className="empty">No encontramos productos con ese criterio. Probá con otra palabra.</div>
      ) : (
        <>
          <div className="grid">
            {filtrados.slice(0, limit).map(p => <Card key={p.codigo} p={p} rate={rate} />)}
          </div>
          {filtrados.length > limit && (
            <div style={{ textAlign: 'center', paddingBottom: 40 }}>
              <button className="chip" style={{ padding: '12px 28px', fontSize: 15 }} onClick={() => setLimit(l => l + 48)}>
                Ver más productos ({filtrados.length - limit} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
