'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRate } from './RateContext';
import { useCart } from './CartContext';
import { priceView, ars } from '../lib/format';
import CampaignSlider from './CampaignSlider';

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const precioDe=p=>p.precio.via==='fija'?p.precio.final_usd:p.precio.precio_unit_usd;

function Card({p,rate}) {
  const pv=priceView(p), {agregar}=useCart();
  return <Link href={`/producto/${p.codigo}`} className="card">
    <div className="imgwrap"><div className="badges">
      {p.descuento?<span className="badge desc">-{Math.round(p.descuento)}%</span>:null}
      {p.reacond?<span className="badge reacond">Reacond.</span>:null}
      {p.repuesto?<span className="badge repuesto">Repuesto</span>:p.esNuevo?<span className="badge new">Nuevo</span>:null}
    </div>{p.img?<img src={p.img} alt={p.titulo} loading="lazy"/>:<span className="no-image">Sin imagen</span>}</div>
    <div className="body"><div className="brand">{p.marca}</div><div className="title">{p.titulo}</div>
      <div className="priceblock">{pv.old?<div className="price-old">US$ {Number(pv.old).toLocaleString('es-AR')} <span className="tag-mayor">−10% pedido +US$1000</span></div>:null}
        <div className="price"><span className="cur">US$</span>{Number(pv.main).toLocaleString('es-AR')}{pv.unit?<span className="u"> {pv.unit}</span>:null}</div>
        {rate?<div className="price-ars">{ars(pv.main,rate)}</div>:null}<div className={`ship-note ${pv.noteClass}`}>{pv.note}</div>
        <button className="btn-add" onClick={e=>{e.preventDefault();e.stopPropagation();agregar(p,1);}}>+ Agregar</button>
      </div>
    </div>
  </Link>;
}

export default function Tienda({catalogo}) {
  const rate=useRate();
  const [q,setQ]=useState(''), [cat,setCat]=useState('all'), [orden,setOrden]=useState('relevancia');
  const [pMin,setPMin]=useState(''), [pMax,setPMax]=useState(''), [limit,setLimit]=useState(48), [homeTab,setHomeTab]=useState('novedades');
  const catRef=useRef(null), sectionRef=useRef(null), inputRef=useRef(null);
  useEffect(()=>setLimit(48),[q,cat,orden,pMin,pMax]);
  const tokens=norm(q).split(/\s+/).filter(Boolean);
  const filtrados=useMemo(()=>{
    let result=catalogo.productos.filter(p=>{
      if(cat!=='all'&&p.catSlug!==cat)return false;
      if(tokens.length&&!tokens.every(t=>norm(`${p.titulo} ${p.marca} ${p.categoria}`).includes(t)))return false;
      const precio=precioDe(p);
      return !(pMin!==''&&precio<Number(pMin))&&!(pMax!==''&&precio>Number(pMax));
    });
    if(orden==='menor')result=[...result].sort((a,b)=>precioDe(a)-precioDe(b));
    if(orden==='mayor')result=[...result].sort((a,b)=>precioDe(b)-precioDe(a));
    return result;
  },[catalogo.productos,cat,q,orden,pMin,pMax]);
  const enHome=!tokens.length&&cat==='all'&&pMin===''&&pMax==='';
  const novedades=useMemo(()=>catalogo.productos.filter(p=>p.esNuevo),[catalogo.productos]);
  const ofertas=useMemo(()=>catalogo.productos.filter(p=>p.descuento),[catalogo.productos]);
  const seleccion=useMemo(()=>{
    const selected=[], counts=new Map();
    for(const p of catalogo.productos){if(['APPLE','SAMSUNG','JBL','XIAOMI','SONY','LATTAFA','AMAZON'].includes(p.marca)&&(counts.get(p.marca)||0)<2){selected.push(p);counts.set(p.marca,(counts.get(p.marca)||0)+1);}}
    return selected.length?selected:catalogo.productos.slice(0,10);
  },[catalogo.productos]);
  const homeProducts=(homeTab==='ofertas'?ofertas:homeTab==='seleccion'?seleccion:novedades.length?novedades:catalogo.productos).slice(0,10);
  const marcas=useMemo(()=>[...catalogo.productos.reduce((m,p)=>{if(p.marca)m.set(p.marca,(m.get(p.marca)||0)+1);return m;},new Map())].sort((a,b)=>b[1]-a[1]).slice(0,14),[catalogo.productos]);
  const categoriasHome=catalogo.categorias.slice(0,8).map(c=>({...c,imagen:catalogo.productos.find(p=>p.catSlug===c.slug&&p.img)?.img}));
  const fecha=catalogo.generado?new Date(catalogo.generado).toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'long'}):null;
  const scrollCatalog=()=>requestAnimationFrame(()=>catRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  const explorar=(query='',category='all')=>{setQ(query);setCat(catalogo.categorias.some(c=>c.slug===category)?category:'all');setPMin('');setPMax('');scrollCatalog();};
  const showTab=tab=>{setHomeTab(tab);requestAnimationFrame(()=>sectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));};
  const navCats=['Celulares','Perfumes','Audio','Electrodomésticos','Informática','TV y Video','Gamer','Belleza y Salud'].map(name=>catalogo.categorias.find(c=>c.nombre===name)).filter(Boolean);

  return <>
    <div className="storefront-tools"><div className="container storefront-tools-inner">
      <div className="catalogue-heading"><h1>Catálogo de importación</h1><span>{catalogo.productos.length.toLocaleString('es-AR')} productos · {fecha?`Datos del ${fecha}`:'FVR Logística'}</span></div>
      <div className="search"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input ref={inputRef} type="search" aria-label="Buscar en el catálogo FVR" placeholder="Buscá productos, marcas o modelos…" value={q} onChange={e=>setQ(e.target.value)}/>{q?<button className="clear" aria-label="Limpiar búsqueda" onClick={()=>setQ('')}>×</button>:null}
      </div>
    </div></div>
    <nav className="department-nav" aria-label="Categorías principales"><div className="container department-nav-inner"><button className="department-all" onClick={()=>{explorar();inputRef.current?.focus();}}>☰ <span>Todo el catálogo</span></button>{navCats.map(c=><button key={c.slug} className={cat===c.slug?'active':''} onClick={()=>explorar('',c.slug)}><span>{c.emoji}</span>{c.nombre}</button>)}</div></nav>
    {enHome&&<>
      <CampaignSlider onExplore={explorar}/>
      <div className="service-ribbon"><div className="container"><b>FVR · Importación internacional</b><span>Envíos a todo el país</span><span>Pagá en pesos al valor del USDT</span><span>Atención directa por WhatsApp</span></div></div>
    </>}
    <main className="container catalogue-main">
      {enHome&&<>
        <section className="home-product-section" ref={sectionRef}>
          <div className="market-section-head"><div className="market-tabs" role="tablist" aria-label="Selecciones del catálogo"><button role="tab" aria-selected={homeTab==='novedades'} onClick={()=>showTab('novedades')}>Novedades <span>{novedades.length.toLocaleString('es-AR')}</span></button><button role="tab" aria-selected={homeTab==='ofertas'} onClick={()=>showTab('ofertas')}>Ofertas</button><button role="tab" aria-selected={homeTab==='seleccion'} onClick={()=>showTab('seleccion')}>Selección FVR</button></div><button className="section-link-btn" onClick={scrollCatalog}>Ver todo ↗</button></div>
          <p className="market-section-description">{homeTab==='novedades'?'Productos incorporados en la última actualización del catálogo.':homeTab==='ofertas'?'Oportunidades del proveedor, con tu precio FVR calculado.':'Una selección de tecnología, audio y marcas para descubrir.'}</p>
          {homeProducts.length?<div className="grid home-product-grid">{homeProducts.map(p=><Card key={p.codigo} p={p} rate={rate}/>)}</div>:<div className="empty">No hay ofertas publicadas en esta actualización.</div>}
        </section>
        <div className="brand-strip"><span className="brand-strip-label">MARCAS PARA ELEGIR</span><div className="brand-pills">{marcas.map(([marca])=><button key={marca} onClick={()=>explorar(marca)}>{marca}</button>)}</div></div>
        <div className="feature-promos"><button onClick={()=>explorar('Karma','perfumes')}><img src="/campanas/karma.webp" alt="Descubrí la colección Maison Karma" loading="lazy"/><span>Maison Karma <b>Ver fragancias ↗</b></span></button><button onClick={()=>explorar('Smartfy','tv-y-video')}><img src="/campanas/tv.webp" alt="Smart TV Smartfy" loading="lazy"/><span>Tu próximo Smart TV <b>Ver modelos ↗</b></span></button></div>
        <div className="home-section-head"><div><span className="eyebrow">ENCONTRÁ LO QUE BUSCÁS</span><h2 className="section-title">Explorá por categoría</h2></div><button className="section-link-btn" onClick={scrollCatalog}>{catalogo.categorias.length} categorías ↗</button></div>
        <div className="category-showcase">{categoriasHome.map((c,i)=><button key={c.slug} className={`category-feature category-feature-${i+1}`} onClick={()=>explorar('',c.slug)}>{c.imagen&&<img src={c.imagen} alt="" loading="lazy"/>}<span className="category-shade"/><span className="category-copy"><i>{c.emoji}</i><b>{c.nombre}</b><small>{c.cantidad.toLocaleString('es-AR')} productos</small></span><span className="category-arrow">↗</span></button>)}</div>
        <div className="buying-strip"><div><b>Armá tu pedido, nosotros te acompañamos.</b><p>Compra mínima US$250 · Precios en USDT · Consultá el envío en tu pedido.</p></div><a href="https://wa.me/543883372745" target="_blank" rel="noreferrer">Hablar con FVR ↗</a></div>
      </>}
      <section ref={catRef} className="catalogue-results" aria-label="Productos del catálogo">
        <div className="cats"><button className={`chip ${cat==='all'?'active':''}`} onClick={()=>setCat('all')}>Todo <span className="c">{catalogo.productos.length.toLocaleString('es-AR')}</span></button>{catalogo.categorias.map(c=><button key={c.slug} className={`chip ${cat===c.slug?'active':''}`} onClick={()=>setCat(c.slug)}>{c.emoji} {c.nombre} <span className="c">{c.cantidad.toLocaleString('es-AR')}</span></button>)}</div>
        <div className="toolbar"><select aria-label="Ordenar productos" className="tb-select" value={orden} onChange={e=>setOrden(e.target.value)}><option value="relevancia">Ordenar: Relevancia</option><option value="menor">Precio: menor a mayor</option><option value="mayor">Precio: mayor a menor</option></select><div className="tb-range"><input aria-label="Precio mínimo en dólares" className="tb-input" type="number" min="0" placeholder="Precio mín." value={pMin} onChange={e=>setPMin(e.target.value)}/><span className="tb-sep">—</span><input aria-label="Precio máximo en dólares" className="tb-input" type="number" min="0" placeholder="Precio máx." value={pMax} onChange={e=>setPMax(e.target.value)}/>{(pMin!==''||pMax!=='')&&<button className="tb-clear" onClick={()=>{setPMin('');setPMax('');}}>Limpiar</button>}</div></div>
        <h2 className="section-title">{tokens.length?`Resultados para “${q}”`:cat==='all'?'Catálogo completo':catalogo.categorias.find(c=>c.slug===cat)?.nombre||'Productos'}</h2><div className="section-sub">{filtrados.length.toLocaleString('es-AR')} productos {(!enHome&&cat!=='all')?<button className="reset-catalogue" onClick={()=>explorar()}>Ver todo el catálogo</button>:null}</div>
        {!filtrados.length?<div className="empty"><div className="big">⌕</div>No encontramos productos con ese criterio.<br/>Probá con otra palabra o ajustá los filtros.</div>:<><div className="grid">{filtrados.slice(0,limit).map(p=><Card key={p.codigo} p={p} rate={rate}/>)}</div>{filtrados.length>limit&&<div className="load-more-wrap"><button className="vermas" onClick={()=>setLimit(l=>l+48)}>Ver más productos <span>({(filtrados.length-limit).toLocaleString('es-AR')} más)</span></button></div>}</>}
      </section>
    </main>
  </>;
}
