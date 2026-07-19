'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRate } from './RateContext';
import { useCart } from './CartContext';
import { priceView, ars } from '../lib/format';

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const precioDe = p => p.precio.via === 'fija' ? p.precio.final_usd : p.precio.precio_unit_usd;

function Card({ p, rate }) {
  const pv = priceView(p);
  const { agregar } = useCart();
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
          <button className="btn-add" onClick={e => { e.preventDefault(); e.stopPropagation(); agregar(p, 1); }}>
            + Agregar
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function Tienda({ catalogo }) {
  const rate = useRate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [orden, setOrden] = useState('relevancia');
  const [pMin, setPMin] = useState('');
  const [pMax, setPMax] = useState('');
  const [limit, setLimit] = useState(48);
  const catRef = useRef(null);
  useEffect(() => { setLimit(48); }, [q, cat, orden, pMin, pMax]);

  const tokens = norm(q).split(/\s+/).filter(Boolean);
  const filtrados = useMemo(() => {
    let r = catalogo.productos.filter(p => {
      if (cat !== 'all' && p.catSlug !== cat) return false;
      if (tokens.length) {
        const hay = norm(`${p.titulo} ${p.marca} ${p.categoria}`);
        if (!tokens.every(t => hay.includes(t))) return false;
      }
      const precio = precioDe(p);
      if (pMin !== '' && precio < Number(pMin)) return false;
      if (pMax !== '' && precio > Number(pMax)) return false;
      return true;
    });
    if (orden === 'menor') r = [...r].sort((a, b) => precioDe(a) - precioDe(b));
    else if (orden === 'mayor') r = [...r].sort((a, b) => precioDe(b) - precioDe(a));
    return r;
  }, [catalogo.productos, cat, q, orden, pMin, pMax]);

  const buscando = tokens.length > 0;
  const enHome = !buscando && cat === 'all' && pMin === '' && pMax === '';
  const ofertas = enHome ? catalogo.productos.filter(p => p.descuento) : [];

  const irACategoria = (slug) => {
    setCat(slug);
    requestAnimationFrame(() => catRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <>
      {enHome && (
        <div className="hero">
          <div className="container hero-grid">
            <div>
              <span className="hero-pill">✈️ Por FVR Logística Internacional</span>
              <h1>Productos <em>importados</em>,<br />precio final <em>por unidad</em></h1>
              <p>Elegí tus productos, armá tu pedido y envialo por WhatsApp. El envío nacional se calcula solo, según el peso.</p>
              <div className="hero-marks">
                <span>🚚 Envío a todo el país</span>
                <span>💵 Pagá en pesos al valor del USDT del día</span>
                <span>🛒 Compra mínima US$250</span>
                <span>🔄 Stock actualizado a diario</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-logo-card">
                <img src="https://raw.githubusercontent.com/francatamarca/fvr-catalogo/main/public/logo-fvr.jpg" alt="FVR" />
              </div>
              <div className="hero-chip chip-a">🎁 <b>Envío gratis</b><span>en compras desde US$400</span></div>
              <div className="hero-chip chip-b">📦 <b>{catalogo.productos.length.toLocaleString('es-AR')} productos</b><span>de stock real</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        <div style={{ paddingTop: 14 }}>
          <div className="search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              placeholder="Buscá tu producto… (ej: iphone, jbl, perfume)"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q ? <button className="clear" onClick={() => setQ('')}>×</button> : null}
          </div>
        </div>

        {enHome && (
          <>
            <div className="section-title">Explorá por categoría</div>
            <div className="catgrid">
              {catalogo.categorias.map(c => (
                <button key={c.slug} className="cattile" onClick={() => irACategoria(c.slug)}>
                  <span className="em">{c.emoji}</span>
                  <span className="nm">{c.nombre}</span>
                  <span className="ct">{c.cantidad.toLocaleString('es-AR')} productos</span>
                </button>
              ))}
            </div>
          </>
        )}

        {ofertas.length > 0 && (
          <>
            <div className="section-title">🔥 Ofertas del día</div>
            <div className="section-sub">Con descuento real del proveedor, ya con tu precio final calculado.</div>
            <div className="grid">
              {ofertas.slice(0, 10).map(p => <Card key={p.codigo} p={p} rate={rate} />)}
            </div>
          </>
        )}

        <div ref={catRef} style={{ scrollMarginTop: 130 }}>
          <div className="cats">
            <button className={`chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
              Todo <span className="c">{catalogo.productos.length.toLocaleString('es-AR')}</span>
            </button>
            {catalogo.categorias.map(c => (
              <button key={c.slug} className={`chip ${cat === c.slug ? 'active' : ''}`} onClick={() => setCat(c.slug)}>
                {c.emoji} {c.nombre} <span className="c">{c.cantidad.toLocaleString('es-AR')}</span>
              </button>
            ))}
          </div>

          <div className="toolbar">
            <select className="tb-select" value={orden} onChange={e => setOrden(e.target.value)}>
              <option value="relevancia">Ordenar: Relevancia</option>
              <option value="menor">Precio: menor a mayor</option>
              <option value="mayor">Precio: mayor a menor</option>
            </select>
            <div className="tb-range">
              <input className="tb-input" type="number" min="0" placeholder="Precio mín." value={pMin} onChange={e => setPMin(e.target.value)} />
              <span className="tb-sep">—</span>
              <input className="tb-input" type="number" min="0" placeholder="Precio máx." value={pMax} onChange={e => setPMax(e.target.value)} />
              {(pMin !== '' || pMax !== '') && <button className="tb-clear" onClick={() => { setPMin(''); setPMax(''); }}>Limpiar</button>}
            </div>
          </div>

          <div className="section-title">
            {buscando ? `Resultados para "${q}"` : cat === 'all' ? 'Catálogo completo' : `${catalogo.categorias.find(c => c.slug === cat)?.emoji ?? ''} ${catalogo.categorias.find(c => c.slug === cat)?.nombre ?? ''}`}
          </div>
          <div className="section-sub">{filtrados.length.toLocaleString('es-AR')} productos</div>

          {filtrados.length === 0 ? (
            <div className="empty">
              <div className="big">🔍</div>
              No encontramos productos con ese criterio.<br />Probá con otra palabra o ajustá los filtros.
            </div>
          ) : (
            <>
              <div className="grid">
                {filtrados.slice(0, limit).map(p => <Card key={p.codigo} p={p} rate={rate} />)}
              </div>
              {filtrados.length > limit && (
                <div style={{ textAlign: 'center', paddingBottom: 42 }}>
                  <button className="vermas" onClick={() => setLimit(l => l + 48)}>
                    Ver más productos <span style={{ opacity: .7 }}>({(filtrados.length - limit).toLocaleString('es-AR')} más)</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
