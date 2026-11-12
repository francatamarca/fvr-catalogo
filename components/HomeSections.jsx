'use client';
import {useState} from 'react';
import visual from '../data/home-visual.json';
const imageFor=(name)=>visual.categories.find(c=>c.alt===name)?.src;
export function BrandGallery({onExplore}) {
  return <section className="brand-gallery" aria-label="Marcas para elegir"><div className="brand-gallery-grid">{visual.logos.map(m=><button key={m.name} onClick={()=>onExplore(m.name)} aria-label={`Ver productos ${m.name}`}><img src={m.src} alt={m.name} width="200" height="64" loading="lazy"/></button>)}</div></section>;
}
export function CategoryGallery({categories,products,onExplore}) {
  const [page,setPage]=useState(0);
  const featured=[{name:'Electrodomésticos',slug:'electrodomesticos',emoji:'⌂'},{name:'Celulares y SmartPhones',slug:'celulares',emoji:'▯'},{name:'Automóvil',slug:'automovil',emoji:'♧'}];
  const slugFor=name=>categories.find(c=>c.nombre===name)?.slug;
  const categoryOrder=['Audio','Belleza y Salud','Juguetes y Otros','Cámaras y Drones','Herramienta','Gamer','Iluminación y LED','Informática','Maletas para Viaje','Motociclismo','Perfumes','Accesorios y Periféricos','Calculadora','Receptores y Accesorios','Reloj','Seguridad','TV y Video','Termos y Vasos Térmicos'];
  const others=[...categories].filter(c=>!featured.some(f=>f.slug===c.slug)).sort((a,b)=>categoryOrder.indexOf(a.nombre)-categoryOrder.indexOf(b.nombre));
  const pages=Math.max(1,Math.ceil(others.length/12));
  const remainingImages={};
  return <section className="category-gallery" aria-labelledby="explore-categories"><div className="container category-gallery-inner">
    <h2 id="explore-categories">EXPLORAR CATEGORÍAS</h2>
    <div className="category-major-grid">{featured.map(c=>{
      const group=products.filter(p=>p.catSlug===(slugFor(c.name)||c.slug));
      return <button key={c.slug} className="category-major" onClick={()=>onExplore('',slugFor(c.name)||c.slug)}><h3><span>{c.emoji}</span>{c.name}</h3><img className="category-major-image" src={imageFor(c.name)} alt={c.name} loading="lazy"/><div className="category-thumbnails">{group.filter(p=>p.img).slice(0,4).map(p=><img key={p.codigo} src={p.img} alt="" loading="lazy"/>)}</div></button>;
    })}</div>
    <div className="all-categories-panel"><div className="all-categories-head"><h3>TODAS LAS CATEGORÍAS</h3><button onClick={()=>onExplore()}>Ver todo ↗</button></div><div className="all-categories-grid">{others.slice(page*12,page*12+12).map(c=>{
      const img=imageFor(c.nombre)||imageFor(remainingImages[c.nombre])||products.find(p=>p.catSlug===c.slug&&p.img)?.img;
      return <button key={c.slug} onClick={()=>onExplore('',c.slug)}>{img&&<img src={img} alt="" loading="lazy"/>}<b>{c.nombre}</b></button>;
    })}</div>{pages>1&&<div className="category-pagination" aria-label="Páginas de categorías"><button onClick={()=>setPage(p=>(p+pages-1)%pages)} aria-label="Ver categorías anteriores">‹</button>{Array.from({length:pages},(_,i)=><button className={`category-dot ${page===i?'active':''}`} key={i} aria-label={`Página ${i+1} de categorías`} aria-pressed={page===i} onClick={()=>setPage(i)}/>)}<button onClick={()=>setPage(p=>(p+1)%pages)} aria-label="Ver categorías siguientes">›</button></div>}</div>
  </div></section>;
}
