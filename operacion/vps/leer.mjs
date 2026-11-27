import { firefox } from 'playwright';
import { mkdir, writeFile, rename, readdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.argv[2];
if (!root) throw Error('Indicá un directorio nuevo para esta lectura');
await mkdir(root, { recursive: true });
const departments = ['Accesorios y Periféricos','Audio','Automóvil','Belleza y Salud','Juguetes y Otros','Calculadora','Cámaras y Drones','Celulares y SmartPhones','Electrodomésticos','Herramienta','Gamer','Termos y Vasos Térmicos','Iluminación y LED','Perfumes','Informática','Receptores y Accesorios','Reloj','Seguridad','TV y Video','Maletas para Viaje','Motociclismo'];
const host = 'https://madridcenterimportados.com';
const browser = await firefox.launch();
const contexts = {};
const cards = 'main div[aria-label^="Tarjeta de"]:visible';
const stamp = () => new Date().toISOString();
let denial;
const filesFor=(list,lang,i)=>list.filter(f=>f.startsWith(lang+'-'+i+'-')&&f.endsWith('.json'));
async function persistedPair(i,name){
  const list=await readdir(root);
  const ids=[];
  for(const lang of ['es','br']){
    const pages=await Promise.all(filesFor(list,lang,i).map(async f=>JSON.parse(await readFile(path.join(root,f),'utf8'))));
    pages.sort((a,b)=>a.start-b.start);
    if(!pages.length||!pages.at(-1).terminal)return null;
    const rows=new Map();let n=0;
    for(const page of pages){
      if(page.name!==name||page.start!==n+1||page.total!==pages[0].total||Date.now()-Date.parse(page.startTime)>2*3600000)return null;
      for(const r of page.rows)rows.set(lang==='es'?r[0]:r.codigo,lang==='es'?r[2]:r.available);
      n+=page.rows.length;
    }
    if(n!==pages[0].total||rows.size!==n)return null;
    ids.push(rows);
  }
  return ids[0].size===ids[1].size&&[...ids[0]].every(([k,v])=>ids[1].get(k)===v)?ids[0].size:null;
}
async function save(name, obj) {
  const filename = path.join(root, name+'.json');
  await writeFile(filename+'.tmp',JSON.stringify(obj));
  await rename(filename+'.tmp',filename);
}
async function readCategory(page, url, lang, name, i, attempt) {
  const startTime = stamp();
  const response = await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  const amount = page.locator('select:visible').filter({has:page.locator('option[value="100"]')}).first();
  const limit=attempt===3?'48':'100';
  const sort=(lang==='es'?['Nuevo','Menor precio','Mayor precio']:['Novo','Menor preço','Maior preço'])[attempt-1];
  await amount.selectOption({label:limit});
  await page.getByRole('combobox').filter({has:page.getByRole('option',{name:sort,exact:true})}).first().selectOption({label:sort});
  const rows = new Map(), counts=[];
  let total, first = '', start=1;
  for (let pg=1;pg<=250;pg++) {
    if (denial) throw Error(denial);
    await page.waitForFunction(({start,first,limit,sort})=>{
      const card = Array.from(document.querySelectorAll('main div[aria-label^="Tarjeta de"]')).find(c=>c.getBoundingClientRect().width);
      const code = card?.innerText.match(/Cod:\s*(\d+)/)?.[1];
      const text = document.body.innerText;
      const range = text.match(/Mostrando\s+([\d.,]+)\s+a\s+[\d.,]+\s+de\s+[\d.,]+/i);
      const selections=Array.from(document.querySelectorAll('select')).map(s=>s.selectedOptions[0]?.textContent);
      return code && code!==first && (range?Number(range[1].replace(/\D/g,''))===start:start===1) && selections.includes(limit) && selections.includes(sort);
    },{start,first,limit,sort},{timeout:25000});
    const listing=await page.locator(cards).evaluateAll((elements,lang)=>{
      return elements.map(c=>{
        const lines=c.innerText.split(/\n+/).map(s=>s.trim()).filter(Boolean);
        const idx=lines.findIndex(s=>/^Cod:/i.test(s));
        const codigo=lines[idx]?.match(/\d+/)?.[0],titulo=c.querySelector('h3')?.innerText;
        const btn=c.querySelector('button[aria-label*="al carrito"]');
        const available=!!btn&&!btn.disabled&&btn.getAttribute('aria-disabled')!=='true'&&!lines.some(s=>/^(agotado|esgotado)$/i.test(s));
        if(lang==='es')return [codigo,titulo,available];
        const prices=lines.filter(s=>/^\$\s*[\d,.]+$/.test(s)).map(s=>Number(s.replace(/[^.\d]/g,'')));
        const marca=lines.slice(0,idx).filter(s=>!/^[-\d.,]+%$/.test(s)).at(-1)||'';
        return {codigo,titulo,available,marca,usd:prices.at(-1),oldUSD:prices.length>1?prices[0]:null,href:c.querySelector('a').href,imgs:Array.from(c.querySelectorAll('a img')).map(img=>img.src).filter(src=>src.startsWith('https:'))};
      });
    },lang);
    const body=await page.locator('body').innerText();
    const range=body.match(/Mostrando\s+([\d.,]+)\s+a\s+([\d.,]+)\s+de\s+([\d.,]+)/i);
    const num=s=>Number(s?.replace(/\D/g,''));
    const advertised=num(range?.[3]||body.match(/([\d.,]+)\s+prod(?:uc|u)tos?\s+encontrad/i)?.[1]);
    total??=advertised;
    assert.ok(advertised===total&&total>0,name+' total cambiante');
    assert.ok(listing.length>0,name+' página vacía');
    const end=range?num(range[2]):total;
    counts.push({inicio:start,fin:end,tarjetas:listing.length});
    for (const r of listing) {
      const code=lang==='es'?r[0]:r.codigo;
      assert.match(code||'',/^\d+$/);
      const old=rows.get(code);
      if(old)assert.deepEqual(facts(lang,old),facts(lang,r),name+' cambió '+code);
      rows.set(code,r);
      if(lang==='br'&&r.available)assert.ok(r.usd>0,'Sin precio '+code);
    }
    const next=page.getByRole('button',{name:'Página siguiente',exact:true}).filter({visible:true}).first();
    const terminal=!await next.count()||!await next.isEnabled();
    if(terminal){
      assert.equal(end,total,name+' última página sin alcanzar el total anunciado');
      return {rows,total,counts,sort,startTime,leido:stamp()};
    }
    start=end+1; first=lang==='es'?listing[0][0]:listing[0].codigo;
    await next.press('Enter');
  }
  throw Error('Sin fin de paginación '+name);
}
function facts(lang,r){
  return lang==='es'?[r[1],r[2]]:[r.titulo,r.available,r.usd,r.oldUSD];
}
function matchingViews(pair){
  const [es,br]=pair;
  return es.total===br.total&&es.rows.size===br.rows.size&&
    [...es.rows].every(([code,r])=>br.rows.get(code)?.available===r[2]);
}
async function verifyCategory(es,br,route,name,i){
  const attempts=[];
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const readings=await Promise.allSettled([readCategory(es,host+route,'es',name,i,attempt),readCategory(br,host+route.slice(3),'br',name,i,attempt)]);
      const failure=readings.find(r=>r.status==='rejected');
      if(failure)throw failure.reason;
      const pair=readings.map(r=>r.value);
      const agreed=matchingViews(pair);
      const exact=agreed&&pair.every(p=>p.rows.size===p.total);
      // Un contador desfasado sólo se admite cuando la misma lista completa
      // de códigos, precios y stock se reproduce con dos órdenes distintos.
      const independentlyVerified=agreed&&pair.every(p=>p.rows.size>=p.total&&p.rows.size-p.total<=5)&&attempts.some(prior=>
        matchingViews(prior)&&pair.every((p,n)=>p.total===prior[n].total&&p.rows.size===prior[n].rows.size&&
          [...p.rows].every(([k,r])=>prior[n].rows.has(k)&&JSON.stringify(facts(n?'br':'es',r))===JSON.stringify(facts(n?'br':'es',prior[n].rows.get(k))))));
      attempts.push(pair);
      if(!exact&&!independentlyVerified)throw Error(name+' · únicos ES/BR '+pair.map(p=>p.rows.size+'/'+p.total).join(', '));
      for(const [n,lang] of ['es','br'].entries()){
        const p=pair[n];
        await save(lang+'-'+i+'-1',{name,start:1,terminal:true,startTime:p.startTime,leido:p.leido,total:p.rows.size,rows:[...p.rows.values()]});
      }
      await save('evidencia-'+i,{name,observaciones:attempts.map(pair=>pair.map(p=>({orden:p.sort,anunciado:p.total,unicos:p.rows.size,paginas:p.counts})))});
      return pair[0].rows.size;
    }catch(error){
      if(denial||attempt===3)throw Error(denial||error.message);
      console.log('Releyendo',name,error.message);
    }
  }
}
try {
  for(const lang of ['es','br']){
    const ctx=await browser.newContext();
    // Para comparar el catálogo sólo necesitamos las URL visibles de las fotos.
    // Evitar descargar y decodificar cientos de imágenes por página.
    await ctx.route('**/*',r=>{
      const req=r.request();
      if(['image','media','font'].includes(req.resourceType()))return r.abort();
      return r.continue();
    });
    ctx.on('response',r=>{if(r.headers()['cf-mitigated']==='challenge'||(r.status()===403&&['document','xhr','fetch'].includes(r.request().resourceType())))denial='Acceso rechazado en '+new URL(r.url()).hostname;});
    const p=await ctx.newPage();p.setDefaultTimeout(20000);
    contexts[lang]=p;
    await p.goto(host+(lang==='es'?'/es':'')+'/home',{waitUntil:'domcontentloaded'});
    await p.locator(cards).first().waitFor();
  }
  const {es,br}=contexts;
  const codes=()=>es.locator(cards).evaluateAll(els=>els.slice(0,8).map(c=>c.innerText.match(/Cod:\s*(\d+)/)?.[1]));
  const heroes=p=>p.locator('img[alt^="Promoción destacada"]').evaluateAll(imgs=>imgs.map(img=>({label:img.closest('[aria-label]')?.getAttribute('aria-label'),src:img.src})).filter(x=>x.src.includes('banners')));
  const home={leido:stamp(),banners:await heroes(es),bannersBR:await heroes(br),novedades:await codes()};
  await es.getByRole('button',{name:'OFERTAS DE LA SEMANA',exact:true}).click();
  await es.waitForFunction(first=>{const el=Array.from(document.querySelectorAll('main div[aria-label^="Tarjeta de"]')).find(c=>c.getBoundingClientRect().width);return el&&!el.innerText.includes('Cod: '+first)},home.novedades[0]);
  home.ofertas=await codes();assert.ok(home.novedades.length===8&&home.ofertas.length===8&&home.banners.length&&home.bannersBR.length);
  await save('portada',home);
  const menu=await es.context().newPage();
  const incomplete=[];
  for(const [i,name] of departments.entries()){
    if(denial) throw Error(denial);
    const saved=await persistedPair(i,name);
    if(saved){console.log('FVR_CATEGORIA',i+1,name,saved,'verificada en esta corrida');continue}
    await menu.goto(host+'/es/home',{waitUntil:'domcontentloaded'});
    await menu.locator(cards).first().waitFor();
    await menu.getByRole('button',{name:'Menú Principal',exact:true}).click();
    await menu.getByRole('button',{name,exact:true}).last().click();
    await menu.waitForURL(u=>u.pathname.startsWith('/es/categoria/'));
    const route=new URL(menu.url()).pathname;
    const list=await readdir(root);
    for(const lang of ['br','es'])for(const f of filesFor(list,lang,i))await unlink(path.join(root,f));
    try{console.log('FVR_CATEGORIA',i+1,name,await verifyCategory(es,br,route,name,i))}
    catch(error){if(denial)throw error;incomplete.push(name+': '+error.message);console.log('Pendiente',incomplete.at(-1))}
  }
  if(denial)throw Error(denial);
  if(incomplete.length)throw Error(incomplete.join(' / '));
  console.log('FVR_LECTURA_COMPLETA',stamp());
}finally{await browser.close()}
