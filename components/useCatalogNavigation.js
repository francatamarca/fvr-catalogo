'use client';
import {useEffect,useRef,useState} from 'react';
import {leerVista,urlVista,retornoSeguro} from '../lib/catalogo-navegacion.js';
const KEY='fvr-posiciones-catalogo-v1';
export const CATALOG_NAV_EVENT='fvr-catalogue-navigation';
function posiciones(){try{const v=JSON.parse(sessionStorage.getItem(KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
export function guardarPosicion(href,anchorId=null){
  try{
    const all=posiciones(),anchor=anchorId?document.getElementById(anchorId):null;
    all[retornoSeguro(href)]={y:window.scrollY,anchor:anchor?.id||null,offset:anchor?.getBoundingClientRect().top??null,at:Date.now()};
    const entries=Object.entries(all).sort((a,b)=>b[1].at-a[1].at).slice(0,25);
    sessionStorage.setItem(KEY,JSON.stringify(Object.fromEntries(entries)));
  }catch{}
}
export function useCatalogNavigation(sectionRef){
  const [view,setView]=useState(()=>leerVista()),[ready,setReady]=useState(false);
  const intent=useRef('restore');
  useEffect(()=>{setView(leerVista(window.location.search));setReady(true);},[]);
  useEffect(()=>{const back=()=>{intent.current='restore';setView(leerVista(window.location.search));};window.addEventListener('popstate',back);window.addEventListener(CATALOG_NAV_EVENT,back);return()=>{window.removeEventListener('popstate',back);window.removeEventListener(CATALOG_NAV_EVENT,back);};},[]);
  const href=urlVista(view);
  useEffect(()=>{
    if(!ready)return;
    const mode=intent.current;intent.current='restore';if(mode==='none')return;
    const saved=mode==='restore'?posiciones()[retornoSeguro(href)]:null;
    let cancelled=false,frame,attempts=0;
    const stop=()=>{cancelled=true;cancelAnimationFrame(frame);};
    const restore=()=>{
      if(cancelled)return;
      if(saved){
        const anchor=saved.anchor?document.getElementById(saved.anchor):null;
        const top=anchor&&Number.isFinite(saved.offset)?window.scrollY+anchor.getBoundingClientRect().top-saved.offset:saved.y;
        window.scrollTo({top:Math.max(0,Number(top)||0),behavior:'instant'});
      }else if(mode==='section'||view.catalogo||view.favoritos||view.pagina>1)sectionRef.current?.scrollIntoView({block:'start',behavior:'instant'});
      if(saved&&++attempts<12)frame=requestAnimationFrame(restore);
    };
    window.addEventListener('wheel',stop,{passive:true});window.addEventListener('touchstart',stop,{passive:true});window.addEventListener('keydown',stop);
    frame=requestAnimationFrame(restore);
    if(saved)document.fonts?.ready.then(()=>{if(!cancelled)restore();});
    return()=>{stop();window.removeEventListener('wheel',stop);window.removeEventListener('touchstart',stop);window.removeEventListener('keydown',stop);};
  },[href,ready]);
  const change=(patch,{push=false,scroll='none'}={})=>{
    guardarPosicion(href);
    const next=leerVista(new URLSearchParams(urlVista({...view,...patch}).split('?')[1]||''));
    const nextHref=urlVista(next);intent.current=scroll;
    if(nextHref!==window.location.pathname+window.location.search){window.history[push?'pushState':'replaceState'](null,'',nextHref);setView(next);}
    else if(scroll==='section')requestAnimationFrame(()=>sectionRef.current?.scrollIntoView({block:'start',behavior:'instant'}));
  };
  return {view,change,href,ready};
}
