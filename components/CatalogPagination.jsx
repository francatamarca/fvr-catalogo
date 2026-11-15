'use client';
import {useEffect,useState} from 'react';
import {ventanaPaginas} from '../lib/catalogo-navegacion.js';
export default function CatalogPagination({page,totalPages,total,start,end,onChange,position}){
  const [jump,setJump]=useState(String(page));
  useEffect(()=>setJump(String(page)),[page]);
  const go=n=>onChange(Math.max(1,Math.min(totalPages,n)));
  return <nav className="catalogue-pagination" aria-label={`Páginas del catálogo (${position})`}>
    <div className="pagination-summary" aria-live="polite">Mostrando <b>{start.toLocaleString('es-AR')}–{end.toLocaleString('es-AR')}</b> de <b>{total.toLocaleString('es-AR')}</b> productos · Página <b>{page}</b> de <b>{totalPages}</b></div>
    <div className="pagination-controls">
      <div className="pagination-directions"><button disabled={page===1} onClick={()=>go(1)} aria-label="Ir a la primera página">« Primera</button><button disabled={page===1} onClick={()=>go(page-1)} aria-label="Página anterior">‹ Anterior</button></div>
      <div className="pagination-numbers">{ventanaPaginas(page,totalPages).map((n,i)=>typeof n==='number'?<button key={n} aria-label={`Ir a la página ${n}`} aria-current={n===page?'page':undefined} className={n===page?'selected':''} onClick={()=>go(n)}>{n}</button>:<span key={'gap'+i} aria-hidden="true">…</span>)}</div>
      <div className="pagination-directions"><button disabled={page===totalPages} onClick={()=>go(page+1)} aria-label="Página siguiente">Siguiente ›</button><button disabled={page===totalPages} onClick={()=>go(totalPages)} aria-label="Ir a la última página">Última »</button></div>
    </div>
    <form className="pagination-jump" onSubmit={e=>{e.preventDefault();const n=Number(jump);if(Number.isInteger(n)&&n>=1&&n<=totalPages)go(n);}}><label>Ir a página <input aria-label={`Número de página (${position})`} type="number" min="1" max={totalPages} step="1" required value={jump} onChange={e=>setJump(e.target.value)}/></label><button type="submit">Ir</button><span>48 productos por página</span></form>
  </nav>;
}
