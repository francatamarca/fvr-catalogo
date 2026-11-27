import { firefox } from 'playwright';
import { mkdir, writeFile, rename } from 'node:fs/promises';
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
async function save(name, obj) {
  const filename = path.join(root, name+'.json');
  await writeFile(filename+'.tmp',JSON.stringify(obj));
  await rename(filename+'.tmp',filename);
}
async function readCategory(page, url, lang, name, i) {
  const startTime = stamp();
  const response = await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  const amount = page.locator('select:visible').filter({has:page.locator('option[value="100"]')}).first();
  await amount.selectOption({label:'100'});
  await page.getByRole('combobox').filter({has:page.getByRole('option',{name:lang==='es'?'Nuevo':'Novo',exact:true})}).first().selectOption({label:lang==='es'?'Nuevo':'Novo'});
  const seen = new Set();
  let total, first = '', start=1;
  for (let pg=1;pg<=250;pg++) {
    if (denial) throw Error(denial);
    await page.waitForFunction(({start,first,lang})=>{
      const card = Array.from(document.querySelectorAll('main div[aria-label^="Tarjeta de"]')).find(c=>c.getBoundingClientRect().width);
      const code = card?.innerText.match(/Cod:\s*(\d+)/)?.[1];
      const text = document.body.innerText;
      const range = text.match(/Mostrando\s+([\d.,]+)\s+a\s+[\d.,]+\s+de\s+[\d.,]+/i);
      const selections=Array.from(document.querySelectorAll('select')).map(s=>s.selectedOptions[0]?.textContent);
      return code && code!==first && (range?Number(range[1].replace(/\D/g,''))===start:start===1) && selections.includes('100') && selections.includes(lang==='es'?'Nuevo':'Novo');
    },{start,first,lang},{timeout:25000});
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
    assert.equal(listing.length,range?num(range[2])-start+1:total,name+' página incompleta');
    for (const r of listing) {
      const code=lang==='es'?r[0]:r.codigo;
      assert.ok(/^\d+$/.test(code)&&!seen.has(code),name+' repetido o sin código '+code);
      seen.add(code);
      if(lang==='br'&&r.available)assert.ok(r.usd>0,'Sin precio '+code);
    }
    const next=page.getByRole('button',{name:'Página siguiente',exact:true}).filter({visible:true}).first();
    const terminal=!await next.count()||!await next.isEnabled();
    await save(lang+'-'+i+'-'+pg,{startTime,leido:stamp(),start,total,name,rows:listing,terminal});
    if(terminal){assert.equal(seen.size,total,name+' categoría incompleta');return total}
    start+=listing.length; first=lang==='es'?listing[0][0]:listing[0].codigo;
    await next.press('Enter');
  }
  throw Error('Sin fin de paginación '+name);
}
try {
  for(const lang of ['es','br']){
    const ctx=await browser.newContext();
    await ctx.route('**/cdn-cgi/challenge-platform/**',r=>r.abort());
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
  for(const [i,name] of departments.entries()){
    if(denial) throw Error(denial);
    await menu.goto(host+'/es/home',{waitUntil:'domcontentloaded'});
    await menu.locator(cards).first().waitFor();
    await menu.getByRole('button',{name:'Menú Principal',exact:true}).click();
    await menu.getByRole('button',{name,exact:true}).last().click();
    await menu.waitForURL(u=>u.pathname.startsWith('/es/categoria/'));
    const route=new URL(menu.url()).pathname;
    const [a,b]=await Promise.all([readCategory(es,host+route,'es',name,i),readCategory(br,host+route.slice(3),'br',name,i)]);
    assert.equal(a,b);console.log('FVR_CATEGORIA',i+1,name,a);
  }
  if(denial)throw Error(denial);
  console.log('FVR_LECTURA_COMPLETA',stamp());
}finally{await browser.close()}
