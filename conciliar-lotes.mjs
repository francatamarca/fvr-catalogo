// Concilia los listados de precios (BR) y disponibilidad y títulos (ES).
// Uso: node conciliar-lotes.mjs directorio-lotes destino.json [stock-anterior.json]
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const [dir,output,previous]=process.argv.slice(2);
const files=await readdir(dir);
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const reports=[],rows=[],priceTimes=[],stockTimes=[],starts=[];
async function category(lang,i){
  const prefix=lang+'-'+i+'-';
  const names=files.filter(f=>f.startsWith(prefix)&&f.endsWith('.json')).sort((a,b)=>parseInt(a.slice(prefix.length))-parseInt(b.slice(prefix.length)));
  const batches=await Promise.all(names.map(f=>read(path.join(dir,f))));
  assert.ok(batches.length&&batches.at(-1).terminal, prefix+' incompleta');
  const {name,total}=batches[0];
  let count=0;
  for(const [j,b] of batches.entries()){
    assert.ok(b.name===name&&b.total===total&&b.terminal===(j===batches.length-1),prefix+' metadatos');
    assert.ok(Date.now()-Date.parse(b.leido)<86400000&&Date.parse(b.leido)<=Date.now()+60000,prefix+' fecha');
    if(lang==='br'){assert.equal(b.start,count+1);starts.push(b.startTime||b.leido);}
    (lang==='br'?priceTimes:stockTimes).push(b.leido);
    count+=b.rows.length;
  }
  const data=batches.flatMap(b=>b.rows);
  assert.equal(count,total);
  assert.equal(new Set(data.map(r=>lang==='br'?r.codigo:r[0])).size,total);
  return {name,total,data};
}
function image(src){
  const u=new URL(src);
  const v=u.hostname==='wsrv.nl'?new URL(u.searchParams.get('url')):u;
  return v.protocol==='https:'?v.href:null;
}
for(let i=0;i<21;i++){
  const [br,es]=await Promise.all([category('br',i),category('es',i)]);
  assert.equal(br.total,es.total);
  const spanish=new Map(es.data.map(r=>[r[0],r]));
  for(const r of br.data){
    const match=spanish.get(r.codigo);
    assert.ok(match&&match[1]&&match[2]===r.available,'Stock o SKU distinto '+r.codigo);
    rows.push({...r,titulo:match[1],categoria:es.name,imgs:r.imgs.map(image).filter(Boolean)});
  }
  reports.push({category:es.name,count:br.total,total:es.total});
}
const home=await read(path.join(dir,'portada.json'));
assert.ok(Date.now()-Date.parse(home.leido)<86400000&&['ofertas','novedades'].every(k=>Array.isArray(home[k])&&home[k].every(v=>/^\d+$/.test(v))));
const history=previous?await read(previous):{};
const snapshot={capturado:priceTimes.sort().at(-1),stockRevisado:stockTimes.sort().at(-1),lecturaIniciada:starts.sort()[0],idioma:'es',categoriesExpected:reports.map(r=>r.category),reports,rows,next:null,portada:{novedades:home.novedades,ofertas:home.ofertas},conocidosAgotados:(history.rows||[]).filter(r=>r.available===false).map(r=>r.codigo)};
await writeFile(output,JSON.stringify(snapshot));
console.log(rows.length+' filas conciliadas en '+reports.length+' categorías.');

