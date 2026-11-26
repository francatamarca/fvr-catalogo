export const PRODUCTOS_POR_PAGINA=48;
const text=(v,max=180)=>String(Array.isArray(v)?v[0]??'':v??'').slice(0,max);
const amount=v=>{const s=text(v,20);return s!==''&&Number.isFinite(Number(s))&&Number(s)>=0?String(Number(s)):'';};
export function leerVista(input={}){
  const p=typeof input==='string'?new URLSearchParams(input):input;
  const get=k=>typeof p.get==='function'?p.get(k):p[k];
  const pagina=text(get('pagina'),8);
  return {q:text(get('q')),cat:text(get('categoria'),80)||'all',orden:['menor','mayor'].includes(get('orden'))?get('orden'):'relevancia',
    pMin:amount(get('min')),pMax:amount(get('max')),pagina:/^[1-9]\d*$/.test(pagina)?Math.min(1000000,Number(pagina)):1,
    coleccion:['novedades','ofertas','seleccion'].includes(get('coleccion'))?get('coleccion'):'',
    favoritos:get('favoritos')==='1',catalogo:get('catalogo')==='1',
    homeTab:['ofertas','seleccion'].includes(get('pestana'))?get('pestana'):'novedades',brandTab:text(get('marcaInicio'),60)||'KARMA'};
}
export function urlVista(v){
  const p=new URLSearchParams();
  if(v.q)p.set('q',v.q);if(v.cat&&v.cat!=='all')p.set('categoria',v.cat);
  if(v.coleccion)p.set('coleccion',v.coleccion);
  if(v.orden&&v.orden!=='relevancia')p.set('orden',v.orden);
  if(v.pMin!=='')p.set('min',v.pMin);if(v.pMax!=='')p.set('max',v.pMax);
  if(v.pagina>1)p.set('pagina',String(v.pagina));if(v.favoritos)p.set('favoritos','1');if(v.catalogo)p.set('catalogo','1');
  if(v.homeTab&&v.homeTab!=='novedades')p.set('pestana',v.homeTab);if(v.brandTab&&v.brandTab!=='KARMA')p.set('marcaInicio',v.brandTab);
  return p.size?'/?'+p.toString():'/';
}
export function retornoSeguro(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/';
  try{const u=new URL(value,'https://catalogo.invalid');return u.origin==='https://catalogo.invalid'&&u.pathname==='/'?urlVista(leerVista(u.search)):'/';}catch{return '/';}
}
export function ventanaPaginas(actual,total){
  const nums=[1,actual-1,actual,actual+1,total].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b);
  const out=[];for(const n of [...new Set(nums)]){const previo=out[out.length-1];if(typeof previo==='number'&&n-previo===2)out.push(previo+1);else if(typeof previo==='number'&&n-previo>2)out.push('…');out.push(n);}return out;
}
