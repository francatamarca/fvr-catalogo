'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRate } from './RateContext';
import { useCart } from './CartContext';
import { priceView, ars } from '../lib/format';
import CampaignSlider from './CampaignSlider';
import {BrandGallery,CategoryGallery} from './HomeSections';
import {useFavorites,FavoriteButton} from './FavoritesContext';

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const precioDe=p=>p.precio.via==='fija'?p.precio.final_usd:p.precio.precio_unit_usd;

function Card({p,rate}) {
  const pv=priceView(p), {agregar}=useCart();
  return <article className="card">
    <div className="imgwrap"><div className="badges">
      {p.descuento?<span className="badge desc">-{Math.round(p.descuento)}%</span>:null}
      {p.reacond?<span className="badge reacond">Reacond.</span>:null}
      {p.repuesto?<span className="badge repuesto">Repuesto</span>:p.esNuevo?<span className="badge new">Nuevo</span>:null}
    </div><Link href={`/producto/${p.codigo}`} aria-label={`Ver ${p.titulo}`}>{p.img?<img src={p.img} alt={p.titulo} loading="lazy"/>:<span className="no-image">Sin imagen</span>}</Link><FavoriteButton code={p.codigo} title={p.titulo}/></div>
    <div className="body"><div className="brand">{p.marca}</div><Link href={`/producto/${p.codigo}`} className="title">{p.titulo}</Link>
      <div className="priceblock">{pv.old?<div className="price-old">US$ {Number(pv.old).toLocaleString('es-AR')} <span className="tag-mayor">−10% pedido +US$1000</span></div>:null}
        <div className="price"><span className="cur">US$</span>{Number(pv.main).toLocaleString('es-AR')}{pv.unit?<span className="u"> {pv.unit}</span>:null}</div>
        {rate?<div className="price-ars">{ars(pv.main,rate)}</div>:null}<div className={`ship-note ${pv.noteClass}`}>{pv.note}</div>
        <button className="btn-add" onClick={e=>{e.preventDefault();e.stopPropagation();agregar(p,1);}}>+ Agregar</button>
      </div>
    </div>
  </article>;
}

export default function Tienda({catalogo}) {
  const rate=useRate();
  const {codes:favoriteCodes,only:onlyFavorites,setOnly:setOnlyFavorites}=useFavorites();
  const [q,setQ]=useState(''), [cat,setCat]=useState('all'), [orden,setOrden]=useState('relevancia');
  const [pMin,setPMin]=useState(''), [pMax,setPMax]=useState(''), [limit,setLimit]=useState(48), [homeTab,setHomeTab]=useState('novedades'),[brandTab,setBrandTab]=useState('KARMA');
  const catRef=useRef(null), sectionRef=useRef(null), inputRef=useRef(null);
  useEffect(()=>setLimit(48),[q,cat,orden,pMin,pMax,onlyFavorites]);
  useEffect(()=>{if(onlyFavorites){setQ('');setCat('all');setPMin('');setPMax('');}},[onlyFavorites]);
  const tokens=norm(q).split(/\s+/).filter(Boolean);
  const filtrados=useMemo(()=>{
    let result=catalogo.productos.filter(p=>{
      if(onlyFavorites&&!favoriteCodes.includes(String(p.codigo)))return false;
      if(cat!=='all'&&p.catSlug!==cat)return false;
      if(tokens.length&&!tokens.every(t=>norm(`${p.titulo} ${p.marca} ${p.categoria}`).includes(t)))return false;
      const precio=precioDe(p);
      return !(pMin!==''&&precio<Number(pMin))&&!(pMax!==''&&precio>Number(pMax));
    });
    if(orden==='menor')result=[...result].sort((a,b)=>precioDe(a)-precioDe(b));
    if(orden==='mayor')result=[...result].sort((a,b)=>precioDe(b)-precioDe(a));
    return result;
  },[catalogo.productos,cat,q,orden,pMin,pMax,onlyFavorites,favoriteCodes]);
  const enHome=!onlyFavorites&&!tokens.length&&cat==='all'&&pMin===''&&pMax==='';
  const novedades=useMemo(()=>catalogo.productos.filter(p=>p.esNuevo),[catalogo.productos]);
  const ofertas=useMemo(()=>catalogo.productos.filter(p=>p.descuento),[catalogo.productos]);
  const seleccion=useMemo(()=>{
    const selected=[], counts=new Map();
    for(const p of catalogo.productos){if(['APPLE','SAMSUNG','JBL','XIAOMI','SONY','LATTAFA','AMAZON'].includes(p.marca)&&(counts.get(p.marca)||0)<2){selected.push(p);counts.set(p.marca,(counts.get(p.marca)||0)+1);}}
    return selected.length?selected:catalogo.productos.slice(0,10);
  },[catalogo.productos]);
  const homeProducts=(homeTab==='ofertas'?ofertas:homeTab==='seleccion'?seleccion:novedades.length?novedades:catalogo.productos).slice(0,10);
  const brandProducts=useMemo(()=>catalogo.productos.filter(p=>norm(p.marca)===norm(brandTab)).slice(0,8),[catalogo.productos,brandTab]);
  const fecha=(catalogo.stockRevisado||catalogo.generado)?new Date(catalogo.stockRevisado||catalogo.generado).toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'long'}):null;
  const scrollCatalog=()=>requestAnimationFrame(()=>catRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  const explorar=(query='',category='all')=>{setOnlyFavorites(false);setQ(query);setCat(catalogo.categorias.some(c=>c.slug===category)?category:'all');setPMin('');setPMax('');scrollCatalog();};
  const showTab=tab=>{setHomeTab(tab);requestAnimationFrame(()=>sectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));};
  const navCats=['TV y Video','Electrodomésticos','Aire Acondicionado','Celulares','Informática','Perfumes','Automóvil'].map(name=>{if(name==='Aire Acondicionado'){const c=catalogo.categorias.find(c=>c.slug==='electrodomesticos');return c?{...c,nombre:name,emoji:'❄️',query:'aire acondicionado',navKey:'aire'}:null;}return catalogo.categorias.find(c=>c.nombre===name||name==='Celulares'&&c.nombre==='Celulares y SmartPhones');}).filter(Boolean);

  return <>
    <div className="storefront-tools"><div className="container storefront-tools-inner">
      <div className="catalogue-heading"><h1>Catálogo de importación</h1><span>{catalogo.productos.length.toLocaleString('es-AR')} productos · {fecha?`Datos del ${fecha}`:'FVR Logística'}</span></div>
      <div className="search"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input ref={inputRef} type="search" aria-label="Buscar en el catálogo FVR" placeholder="Buscá productos, marcas o modelos…" value={q} onChange={e=>setQ(e.target.value)}/>{q?<button className="clear" aria-label="Limpiar búsqueda" onClick={()=>setQ('')}>×</button>:null}
      </div>
    </div></div>
    <nav className="department-nav" aria-label="Categorías principales"><div className="container department-nav-inner"><button className="department-all" onClick={()=>{explorar();inputRef.current?.focus();}}>☰ <span>Todo el catálogo</span></button>{navCats.map(c=><button key={c.navKey||c.slug} className={cat===c.slug?'active':''} onClick={()=>explorar(c.query||'',c.slug)}><span>{c.emoji}</span>{c.nombre}</button>)}</div></nav>
    {enHome&&<>
      <CampaignSlider onExplore={explorar}/>
      <div className="service-ribbon"><div className="container"><b>FVR · Importación internacional</b><span>Envíos a todo el país</span><span>Pagá en pesos al valor del USDT</span><span>Atención directa por WhatsApp</span></div></div>
    </>}
    <main className="catalogue-main">
      {enHome&&<>
        <section className="container home-product-section" ref={sectionRef}>
          <div className="market-section-head"><div className="market-tabs" role="tablist" aria-label="Selecciones del catálogo"><button role="tab" aria-selected={homeTab==='novedades'} onClick={()=>showTab('novedades')}>Novedades <span>{novedades.length.toLocaleString('es-AR')}</span></button><button role="tab" aria-selected={homeTab==='ofertas'} onClick={()=>showTab('ofertas')}>Ofertas</button><button role="tab" aria-selected={homeTab==='seleccion'} onClick={()=>showTab('seleccion')}>Selección FVR</button></div><button className="section-link-btn" onClick={scrollCatalog}>Ver todo ↗</button></div>
          <p className="market-section-description">{homeTab==='novedades'?'Productos incorporados en la última actualización del catálogo.':homeTab==='ofertas'?'Oportunidades del proveedor, con tu precio FVR calculado.':'Una selección de tecnología, audio y marcas para descubrir.'}</p>
          {homeProducts.length?<div className="grid home-product-grid">{homeProducts.map(p=><Card key={p.codigo} p={p} rate={rate}/>)}</div>:<div className="empty">No hay ofertas publicadas en esta actualización.</div>}
        </section>
        <div className="container feature-promos"><button onClick={()=>explorar('Karma','perfumes')}><img src="/campanas/karma.webp" alt="Descubrí la colección Maison Karma" loading="lazy"/><span>Maison Karma <b>Ver fragancias ↗</b></span></button><button onClick={()=>explorar('Smartfy','tv-y-video')}><img src="/campanas/tv.webp" alt="Smart TV Smartfy" loading="lazy"/><span>Tu próximo Smart TV <b>Ver modelos ↗</b></span></button></div>
        <BrandGallery onExplore={explorar}/>
        <section className="container brand-products-section"><div className="market-section-head"><div className="market-tabs" role="tablist" aria-label="Productos por marca">{['KARMA','SMARTFY','MIDEA','COBY','MT HELMETS'].map(b=><button key={b} role="tab" aria-selected={brandTab===b} onClick={()=>setBrandTab(b)}>{b}</button>)}</div><button className="section-link-btn" onClick={()=>explorar(brandTab)}>Ver más +</button></div><div className="grid home-product-grid">{brandProducts.map(p=><Card key={p.codigo} p={p} rate={rate}/>)}</div></section>
        <CategoryGallery categories={catalogo.categorias} products={catalogo.productos} onExplore={explorar}/>
        <div className="container"><div className="buying-strip"><div><b>Armá tu pedido, nosotros te acompañamos.</b><p>Compra mínima US$250 · Precios en USDT · Consultá el envío en tu pedido.</p></div><a href="https://wa.me/543883372745" target="_blank" rel="noreferrer">Hablar con FVR ↗</a></div></div>
      </>}
      <section ref={catRef} className="container catalogue-results" aria-label="Productos del catálogo">
        {onlyFavorites&&<div className="favorites-notice"><h2>Mis favoritos</h2><p>Guardados en este navegador. Se muestran los que están disponibles en el catálogo actual.</p><button onClick={()=>setOnlyFavorites(false)}>Volver al catálogo</button></div>}
        <div className="cats"><button className={`chip ${cat==='all'?'active':''}`} onClick={()=>setCat('all')}>Todo <span className="c">{catalogo.productos.length.toLocaleString('es-AR')}</span></button>{catalogo.categorias.map(c=><button key={c.slug} className={`chip ${cat===c.slug?'active':''}`} onClick={()=>setCat(c.slug)}>{c.emoji} {c.nombre} <span className="c">{c.cantidad.toLocaleString('es-AR')}</span></button>)}</div>
        <div className="toolbar"><select aria-label="Ordenar productos" className="tb-select" value={orden} onChange={e=>setOrden(e.target.value)}><option value="relevancia">Ordenar: Relevancia</option><option value="menor">Precio: menor a mayor</option><option value="mayor">Precio: mayor a menor</option></select><div className="tb-range"><input aria-label="Precio mínimo en dólares" className="tb-input" type="number" min="0" placeholder="Precio mín." value={pMin} onChange={e=>setPMin(e.target.value)}/><span className="tb-sep">—</span><input aria-label="Precio máximo en dólares" className="tb-input" type="number" min="0" placeholder="Precio máx." value={pMax} onChange={e=>setPMax(e.target.value)}/>{(pMin!==''||pMax!=='')&&<button className="tb-clear" onClick={()=>{setPMin('');setPMax('');}}>Limpiar</button>}</div></div>
        <h2 className="section-title">{onlyFavorites?'Productos guardados':tokens.length?`Resultados para “${q}”`:cat==='all'?'Catálogo completo':catalogo.categorias.find(c=>c.slug===cat)?.nombre||'Productos'}</h2><div className="section-sub">{filtrados.length.toLocaleString('es-AR')} {filtrados.length===1?'producto':'productos'} {(!enHome&&cat!=='all')?<button className="reset-catalogue" onClick={()=>explorar()}>Ver todo el catálogo</button>:null}</div>
        {!filtrados.length?<div className="empty"><div className="big">⌕</div>No encontramos productos con ese criterio.<br/>Probá con otra palabra o ajustá los filtros.</div>:<><div className="grid">{filtrados.slice(0,limit).map(p=><Card key={p.codigo} p={p} rate={rate}/>)}</div>{filtrados.length>limit&&<div className="load-more-wrap"><button className="vermas" onClick={()=>setLimit(l=>l+48)}>Ver más productos <span>({(filtrados.length-limit).toLocaleString('es-AR')} más)</span></button></div>}</>}
      </section>
    </main>
  </>;
}
