'use client';
import { useEffect, useState } from 'react';
import campaignData from '../data/campanas.json';

const campaigns = campaignData.items;

export default function CampaignSlider({ onExplore }) {
  const [active,setActive]=useState(0);
  const [paused,setPaused]=useState(false);
  const [hovered,setHovered]=useState(false);
  useEffect(()=>{
    if(paused || hovered || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=setInterval(()=>setActive(i=>(i+1)%campaigns.length),7000);
    return ()=>clearInterval(timer);
  },[paused,hovered]);
  const c=campaigns[active];
  const move=n=>setActive(i=>(i+n+campaigns.length)%campaigns.length);
  return <section className="campaign-slider" aria-roledescription="carrusel" aria-label="Campañas actuales" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setHovered(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setHovered(false);}}>
    <div className="campaign-frame">
      <button className="campaign-image-button" onClick={()=>onExplore(c.q||'',c.category||'all')} aria-label={`Explorar ${c.title}`}>
        <img src={`/campanas/${c.image}.webp`} width="1920" height="600" alt={c.title} fetchPriority={active===0?'high':'auto'} />
      </button>
      <span className="campaign-fvr-label">SELECCIÓN FVR</span>
      <button className="slider-arrow previous" onClick={()=>move(-1)} aria-label="Campaña anterior">‹</button>
      <button className="slider-arrow next" onClick={()=>move(1)} aria-label="Campaña siguiente">›</button>
      <div className="slider-controls">
        <div className="slider-dots" aria-label="Elegir campaña">{campaigns.map((s,i)=><button key={s.image} className={i===active?'active':''} onClick={()=>setActive(i)} aria-label={`Mostrar campaña ${i+1}: ${s.title}`} aria-pressed={i===active} />)}</div>
        <button className="slider-pause" onClick={()=>setPaused(v=>!v)} aria-label={paused?'Reanudar carrusel':'Pausar carrusel'}>{paused?'▶':'Ⅱ'}</button>
      </div>
    </div>
    <div className="campaign-caption container"><div><b>{c.title}</b><span>{c.detail}</span></div><button onClick={()=>onExplore(c.q||'',c.category||'all')}>Ver productos <span>↗</span></button></div>
  </section>;
}
