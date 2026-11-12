'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {useRouter,usePathname} from 'next/navigation';
import {HeartIcon} from './Icons';
const FavoritesContext=createContext(null);
const KEY='fvr-favoritos-v1';
export const useFavorites=()=>useContext(FavoritesContext);
export function FavoritesProvider({children}) {
  const [codes,setCodes]=useState([]),[ready,setReady]=useState(false),[only,setOnly]=useState(false);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))setCodes([...new Set(v.filter(x=>/^\d+$/.test(String(x))).map(String))]);}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem(KEY,JSON.stringify(codes));}catch{}},[codes,ready]);
  useEffect(()=>{const listener=e=>{if(e.key===KEY)try{const v=JSON.parse(e.newValue||'[]');if(Array.isArray(v))setCodes(v.filter(x=>/^\d+$/.test(String(x))).map(String));}catch{}};window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener);},[]);
  const toggle=code=>setCodes(v=>v.includes(String(code))?v.filter(x=>x!==String(code)):[...v,String(code)]);
  return <FavoritesContext.Provider value={{codes,toggle,only,setOnly}}>{children}</FavoritesContext.Provider>;
}
export function FavoriteButton({code,title,withText=false}) {
  const {codes,toggle}=useFavorites(),active=codes.includes(String(code));
  return <button type="button" className={`favorite-toggle ${active?'saved':''} ${withText?'with-text':''}`} aria-label={`${active?'Quitar de':'Guardar en'} favoritos: ${title}`} aria-pressed={active} onClick={e=>{e.preventDefault();e.stopPropagation();toggle(code);}}><HeartIcon filled={active}/>{withText&&<span>{active?'Guardado en favoritos':'Guardar en favoritos'}</span>}</button>;
}
export function FavoritesHeaderButton(){
  const {codes,only,setOnly}=useFavorites(),router=useRouter(),pathname=usePathname();
  return <button className="favorites-header" aria-label={`Ver favoritos (${codes.length})`} aria-pressed={only} onClick={()=>{setOnly(pathname==='/'?!only:true);if(pathname!=='/')router.push('/');window.scrollTo({top:0,behavior:'smooth'});}}><HeartIcon filled={only}/><span>Favoritos</span>{codes.length>0&&<b>{codes.length}</b>}</button>;
}
