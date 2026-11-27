import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import * as fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {lookup} from 'node:dns/promises';
import {setTimeout as wait} from 'node:timers/promises';
import assert from 'node:assert/strict';

const exec=promisify(execFile);
const base='/estado';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const exists=async file=>fs.access(file).then(()=>true,()=>false);
const pointer=path.join(base,'actual.json');
const status=path.join(base,'estado.json');
const repository='git@github.com:francatamarca/fvr-catalogo.git';
const run=(program,args,cwd,timeout=120000)=>exec(program,args,{cwd,timeout,maxBuffer:4*1024*1024});
const stamp=()=>new Date().toISOString();
async function atomic(file,data){
  await fs.writeFile(file+'.tmp',JSON.stringify(data),{mode:0o600});
  await fs.rename(file+'.tmp',file);
}
async function seed(req){
  if(await exists(pointer))throw Error('La apertura inicial ya se completó.');
  assert.match(process.env.FVR_SEED_SHA256||'',/^[a-f0-9]{64}$/);
  const buffers=[];let size=0;
  for await(const part of req){size+=part.length;if(size>8_000_000)throw Error('Archivo demasiado grande');buffers.push(part)}
  const zipped=Buffer.concat(buffers);
  assert.equal(createHash('sha256').update(zipped).digest('hex'),process.env.FVR_SEED_SHA256,'Archivo inicial distinto del verificado.');
  const {previo,fuente,historico}=JSON.parse(gunzipSync(zipped,{maxOutputLength:120_000_000}));
  const dir=path.join(base,'inicial-validado');await fs.mkdir(dir,{recursive:true,mode:0o700});
  await atomic(path.join(dir,'catalogo.json'),previo);await atomic(path.join(dir,'captura.json'),fuente);
  await atomic(path.join(base,'historico.json'),historico);
  await atomic(pointer,{dir});return {ok:true,productos:previo.total};
}
function canonical(src){
  const u=new URL(src);return new URL(u.hostname==='wsrv.nl'?u.searchParams.get('url'):src).href;
}
async function campaigns(repo,home,pub){
  const approved=await read('/app/campanas-revisadas.json');
  const spanish=new Set(home.banners.map(x=>canonical(x.src)));
  const pending=[],items=[];
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  for(const banner of home.bannersBR){
    const a=approved.find(x=>x.br===canonical(banner.src));
    if(a?.excluida)continue;
    if(!a||(a.es&&!spanish.has(a.es))){pending.push(banner.label);continue}
    const item=a.item;
    const words=norm(item.q||'').split(/\s+/).filter(Boolean);
    const product=pub.productos.some(p=>p.catSlug===item.category&&words.every(w=>norm(p.titulo+' '+(p.marca||'')).includes(w)));
    if(product&&await exists(path.join(repo,'public/campanas',item.image+'.webp')))items.push(item);
  }
  const file=path.join(repo,'data/campanas.json');
  const previous=await read(file);
  if(items.length&&JSON.stringify(items)!==JSON.stringify(previous.items)){
    await fs.writeFile(file,JSON.stringify({...previous,capturado:home.leido.slice(0,10),items},null,2)+'\n');
  }
  return {publicables:items.length,pendientes:pending};
}
async function publish(initial){
  const {dir:previous}=await read(pointer);
  const id=stamp().replace(/[:.]/g,'-');
  const dir=path.join(base,'versiones',id);
  const repo=path.join(dir,'repo');
  const batches=initial?'/primera/inicial':path.join(dir,'lotes');
  await fs.mkdir(dir,{recursive:true,mode:0o700});
  await atomic(status,{estado:'en curso',inicio:stamp()});
  let promoted=false;
  try{
    if(!initial)await run('node',['/app/leer.mjs',batches],dir,45*60000);
    await run('git',['clone','--quiet','--depth=1','--branch','main',repository,repo],dir);
    const snapshot=path.join(dir,'captura.json');
    await run('node',['conciliar-lotes.mjs',batches,snapshot,path.join(previous,'captura.json')],repo);
    await run('node',['importar-captura-ui.mjs',snapshot,path.join(previous,'catalogo.json'),path.join(base,'historico.json')],repo);
    const gz=path.join(repo,'data/catalogo.public.json.gz');
    const oldPublic=JSON.parse(gunzipSync(await fs.readFile(gz)));
    await run('node',['publish.mjs'],repo);
    await run('node',['verificar-publicacion.mjs',snapshot],repo);
    const pub=JSON.parse(gunzipSync(await fs.readFile(gz)));
    assert.ok(Date.parse(pub.generado)>Date.parse(oldPublic.generado),'El catálogo de producción ya tiene una lectura igual o más reciente');
    const campanas=await campaigns(repo,await read(path.join(batches,'portada.json')),pub);
    const a=new Map(oldPublic.productos.map(p=>[String(p.codigo),p])), b=new Map(pub.productos.map(p=>[String(p.codigo),p]));
    const price=p=>p.precio.final_usd??p.precio.precio_unit_usd;
    const result={generado:pub.generado,stock:pub.stockRevisado,total:pub.total,altas:[...b.keys()].filter(k=>!a.has(k)).length,bajas:[...a.keys()].filter(k=>!b.has(k)).length,precios:[...b].filter(([k,p])=>a.has(k)&&price(p)!==price(a.get(k))).length,novedades:pub.portada.novedades.length,ofertas:pub.portada.ofertas.length,campanas};
    await fs.copyFile(path.join(repo,'data/catalogo.json'),path.join(dir,'catalogo.json'));
    await run('git',['add','--','data/catalogo.public.json.gz','data/campanas.json'],repo);
    const author=process.env.FVR_GIT_AUTHOR_EMAIL;
    assert.ok(author&&/^[^\s@]+@[^\s@]+$/.test(author),'Falta el autor de despliegue FVR');
    await run('git',['-c','user.name=FVR Catálogo','-c','user.email='+author,'commit','-m','Actualizar catálogo FVR desde las 21 categorías públicas'],repo);
    await run('git',['push','origin','HEAD:main'],repo);
    promoted=true;await atomic(pointer,{dir});
    result.commit=(await run('git',['rev-parse','HEAD'],repo)).stdout.trim();
    await atomic(status,{estado:'publicado',...result});
    let visible=false;
    for(let i=0;i<25&&!visible;i++){
      try{
        const r=await fetch('https://catalogo.fvrlogistica.com.ar/?revision='+encodeURIComponent(id)+'-'+i,{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});
        const body=await r.text();
        visible=r.ok&&body.includes(pub.generado)&&body.includes(pub.total.toLocaleString('es-AR'));
      }catch{}
      if(!visible)await wait(15000);
    }
    if(!visible)throw Error('Commit '+result.commit+' publicado. El dominio todavía no confirmó la lectura '+pub.generado);
    result.produccionVerificada=stamp();
    await atomic(status,{estado:'verificado',...result});
    return result;
  }finally{
    await fs.rm(repo,{recursive:true,force:true});
    if(!initial)await fs.rm(batches,{recursive:true,force:true});
    if(!promoted)await fs.rm(dir,{recursive:true,force:true});
    if(promoted){
      const keep=new Set([dir,previous]);
      const versions=path.join(base,'versiones');
      for(const entry of await fs.readdir(versions,{withFileTypes:true})){
        const sub=path.join(versions,entry.name);
        if(entry.isDirectory()&&!keep.has(sub))await fs.rm(sub,{recursive:true,force:true});
      }
    }
  }
}
let active=false;
http.createServer(async(req,res)=>{
  const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};
  const ip=req.socket.remoteAddress?.replace(/^::ffff:/,'');
  const allowed=ip==='127.0.0.1'||ip==='::1'||(await lookup('agency-n8n',{all:true}).catch(()=>[])).some(a=>a.address===ip);
  if(!allowed)return send(403,{error:'Sólo n8n puede iniciar la actualización'});
  if(req.method==='GET'&&req.url==='/estado')return send(200,await read(status).catch(()=>({estado:'pendiente'})));
  if(req.method!=='POST'||!['/semilla','/inicial','/actualizar'].includes(req.url))return send(404,{error:'No disponible'});
  if(active)return send(409,{error:'Ya hay una operación en curso'});
  active=true;
  try{send(200,req.url==='/semilla'?await seed(req):await publish(req.url==='/inicial'))}
  catch(e){const msg=[e.message,e.stderr].filter(Boolean).join(' ').slice(-1800);console.error(msg);if(req.url!=='/semilla')await atomic(status,{estado:'falló',fecha:stamp(),error:msg});send(422,{error:msg})}
  finally{active=false}
}).listen(8080,'0.0.0.0');
