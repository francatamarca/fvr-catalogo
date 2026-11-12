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
          {pv.old ? <div className="price-old">US$ {Number(pv.old).toLocaleString('es-AR')} <span className="tag-mayor">🎉 −10% pedido +US$1000</span></div> : null}
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
  const novedadesRef = useRef(null);
  const ofertasRef = useRef(null);
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
  const novedades = enHome ? catalogo.productos.filter(p => p.esNuevo) : [];
  const destacada = novedades[0] || ofertas[0] || catalogo.productos[0];
  const precioDestacada = destacada ? priceView(destacada) : null;
  const categoriasHome = catalogo.categorias.slice(0, 8).map(c => ({
    ...c,
    imagen: catalogo.productos.find(p => p.catSlug === c.slug && p.img)?.img,
  }));
  const marcasHome = [...catalogo.productos.reduce((map, p) => {
    if (p.marca) map.set(p.marca, (map.get(p.marca) || 0) + 1);
    return map;
  }, new Map())].sort((a, b) => b[1] - a[1]).slice(0, 12);

  const irACategoria = (slug) => {
    setCat(slug);
    requestAnimationFrame(() => catRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const irASeccion = ref => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      {enHome && (
        <div className="home-intro">
          <div className="container">
            <section className="campaign-hero">
              <div className="campaign-copy">
                <span className="campaign-kicker"><i /> Selección FVR · importación internacional</span>
                <h1>Lo nuevo del mundo,<br /><em>más cerca de vos.</em></h1>
                <p>Explorá miles de productos importados con precio final por unidad. Armá tu pedido y coordinamos el envío a tu ciudad.</p>
                <div className="campaign-actions">
                  <button className="campaign-primary" onClick={() => irASeccion(novedadesRef)}>Ver novedades <span>↗</span></button>
                  <button className="campaign-secondary" onClick={() => irASeccion(catRef)}>Explorar catálogo <span>↓</span></button>
                </div>
                <div className="campaign-proof">
                  <span><b>{catalogo.productos.length.toLocaleString('es-AR')}</b> productos disponibles</span>
                  <span>Envíos a todo el país</span>
                  <span>Atención directa por WhatsApp</span>
                </div>
              </div>
              <div className="campaign-product">
                <div className="campaign-orbit orbit-one" /><div className="campaign-orbit orbit-two" />
                {destacada?.img ? <img src={destacada.img} alt={destacada.titulo} /> : <img src="/logo-fvr.jpg" alt="FVR Logística Internacional" />}
                <div className="campaign-product-label">
                  <span>{destacada?.esNuevo ? 'RECIÉN INGRESADO' : destacada?.descuento ? 'PRECIO ESPECIAL' : 'DESTACADO FVR'}</span>
                  <b>{destacada?.titulo || 'Productos importados para todo el país'}</b>
                  {precioDestacada && <strong>US$ {Number(precioDestacada.main).toLocaleString('es-AR')}{precioDestacada.unit ? ` ${precioDestacada.unit}` : ''}</strong>}
                </div>
                <span className="campaign-sticker">Importación<br />con respaldo</span>
              </div>
            </section>

            <nav className="home-shortcuts" aria-label="Explorar catálogo">
              <button onClick={() => irASeccion(novedadesRef)}><span className="shortcut-icon fresh">✦</span><span><b>Recién llegados</b><small>Lo nuevo esta semana</small></span><i>↗</i></button>
              <button onClick={() => irASeccion(ofertasRef)}><span className="shortcut-icon deals">%</span><span><b>Ofertas activas</b><small>Encontrá tu oportunidad</small></span><i>↗</i></button>
              <button onClick={() => irASeccion(catRef)}><span className="shortcut-icon allcat">⌕</span><span><b>Todo el catálogo</b><small>Buscá entre categorías</small></span><i>↗</i></button>
            </nav>
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
            <div className="home-section-head"><div><span className="eyebrow">ENCONTRÁ LO QUE BUSCÁS</span><div className="section-title">Explorá por categoría</div></div><span className="section-link">{catalogo.categorias.length} categorías</span></div>
            <div className="category-showcase">
              {categoriasHome.map((c, i) => (
                <button key={c.slug} className={`category-feature category-feature-${i + 1}`} onClick={() => irACategoria(c.slug)}>
                  {c.imagen && <img src={c.imagen} alt="" loading="lazy" />}
                  <span className="category-shade" />
                  <span className="category-copy"><i>{c.emoji}</i><b>{c.nombre}</b><small>{c.cantidad.toLocaleString('es-AR')} productos</small></span>
                  <span className="category-arrow">↗</span>
                </button>
              ))}
            </div>
            <div className="brand-strip">
              <span className="brand-strip-label">MARCAS PARA ELEGIR</span>
              <div className="brand-pills">{marcasHome.map(([marca]) => <button key={marca} onClick={() => { setQ(marca); requestAnimationFrame(() => irASeccion(catRef)); }}>{marca}</button>)}</div>
            </div>
          </>
        )}

        {novedades.length > 0 && (
          <section ref={novedadesRef} className="home-product-section">
            <div className="home-section-head"><div><span className="eyebrow">ACTUALIZADO DESDE EL CATÁLOGO DEL PROVEEDOR</span><div className="section-title">✨ Novedades de la semana</div></div><button className="section-link-btn" onClick={() => irASeccion(catRef)}>Ver catálogo completo ↗</button></div>
            <div className="section-sub">Productos que acaban de entrar en stock, detectados automáticamente.</div>
            <div className="grid home-product-grid">
              {novedades.slice(0, 10).map(p => <Card key={p.codigo} p={p} rate={rate} />)}
            </div>
          </section>
        )}

        {ofertas.length > 0 && (
          <section ref={ofertasRef} className="home-product-section deals-section">
            <div className="home-section-head"><div><span className="eyebrow">OPORTUNIDADES POR TIEMPO LIMITADO</span><div className="section-title">🔥 Ofertas de la semana</div></div><button className="section-link-btn" onClick={() => irASeccion(catRef)}>Ver catálogo completo ↗</button></div>
            <div className="section-sub">Los descuentos vigentes del proveedor, ya con tu precio final calculado.</div>
            <div className="grid home-product-grid">
              {ofertas.slice(0, 10).map(p => <Card key={p.codigo} p={p} rate={rate} />)}
            </div>
          </section>
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
