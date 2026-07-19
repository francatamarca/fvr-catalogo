// Cotizador automático Via Cargo -> data/envios.json
// Reglas de Francisco: origen SIEMPRE Puerto Iguazú, destino Jujuy (lejano), valor declarado
// mínimo ($100.000), pago en destino. Precio final = DOMICILIO + US$5; si no hay domicilio,
// SUCURSAL/AGENCIA + US$10. Conversión ARS->USD con USDT (CriptoYa).
import puppeteer from 'puppeteer-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { CHROME_PATH, UA } from './config.mjs';

const FORM = 'https://formularios.viacargo.com.ar/';
const PESOS = [1, 2, 3, 5, 7, 10, 12, 15, 20, 25, 30, 40, 50, 60];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function usdtRate() {
  // valor agregado del dólar cripto (nunca el mínimo de exchanges: un P2P viejo rompe el valor)
  try {
    const r = await fetch('https://criptoya.com/api/dolar', { headers: { 'user-agent': UA } });
    const v = (await r.json())?.cripto?.usdt?.ask;
    if (typeof v === 'number' && v > 0) return v;
  } catch {}
  const r = await fetch('https://criptoya.com/api/usdt/ars/1', { headers: { 'user-agent': UA } });
  const j = await r.json();
  const vals = Object.values(j).map(v => v?.totalAsk || v?.ask).filter(n => typeof n === 'number' && n > 0).sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)];
}

async function cotizar(page, kg, dims) {
  await page.goto(FORM, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1200);

  const pick = async (idx, texto, matcher) => {
    // tipeo REAL (el autocomplete de Angular ignora el seteo directo de value)
    const handles = await page.$$('input');
    await handles[idx].click({ clickCount: 3 });
    await handles[idx].type(texto, { delay: 45 });
    // esperar a que aparezca la opción (hasta 8s)
    for (let i = 0; i < 16; i++) {
      await sleep(500);
      const ok = await page.evaluate((re) => {
        const o = [...document.querySelectorAll('li, [role=option], mat-option')].find(x => new RegExp(re, 'i').test(x.textContent));
        if (o) { o.click(); return o.textContent.trim(); }
        return null;
      }, matcher);
      if (ok) { await sleep(300); return ok; }
    }
    return null;
  };

  const o1 = await pick(0, 'Puerto Iguazu', 'iguaz');
  const o2 = await pick(1, 'San Salvador de Jujuy', 'jujuy');
  if (!o1 || !o2) throw new Error('no pude fijar origen/destino');

  await page.evaluate((kg, d) => {
    const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const ins = [...document.querySelectorAll('input')];
    set(ins[2], '1'); set(ins[3], String(kg)); set(ins[4], String(d)); set(ins[5], String(d)); set(ins[6], String(d)); set(ins[7], '100000');
    const radio = [...document.querySelectorAll('input[type=radio]')].find(r => r.value === 'D');
    radio.click(); radio.dispatchEvent(new Event('change', { bubbles: true }));
  }, kg, dims);
  await sleep(700);
  await page.evaluate(() => { const b = document.querySelector('button[type=submit]'); if (b && !b.disabled) b.click(); });
  await sleep(3200);

  return page.evaluate(() => {
    const txt = document.body.innerText;
    const bloque = (re) => { const m = txt.match(re); return m ? Number(m[1].replace(/\./g, '')) : null; };
    const dom = bloque(/ENTREGA DOMICILIO[\s\S]{0,120}?\$\s?([\d\.]+)/);
    const suc = bloque(/ENTREGA AGENCIA[\s\S]{0,120}?\$\s?([\d\.]+)/);
    return { dom, suc };
  });
}

async function main() {
  const rate = await usdtRate();
  console.log(`USDT = $${Math.round(rate)} ARS`);
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent(UA);

  const tabla = [];
  for (const kg of PESOS) {
    // caja "densa" (lado = cbrt(kg×3000)) para que facture por peso real y no por volumen
    const dims = Math.max(10, Math.round(Math.cbrt(kg * 3000)));
    let r = null;
    for (let intento = 1; intento <= 3 && !r; intento++) {
      try { r = await cotizar(page, kg, dims); } catch (e) { console.log(`  ${kg}kg intento ${intento}: ${e.message}`); await sleep(2000); }
      if (r && r.dom == null && r.suc == null) r = null;
    }
    if (!r) { console.log(`  ${kg}kg: SIN cotización`); continue; }
    // Via Cargo devuelve valores centinela (~$6-13 millones) cuando el servicio no está disponible
    const dom = (r.dom != null && r.dom < 1000000) ? r.dom : null;
    const suc = (r.suc != null && r.suc < 1000000) ? r.suc : null;
    r = { dom, suc };
    if (dom == null && suc == null) { console.log(`  ${kg}kg: sin servicio disponible`); continue; }
    const usd = dom != null ? Math.ceil(dom / rate + 5) : Math.ceil(suc / rate + 10);
    tabla.push({ kg, ars_dom: r.dom, ars_suc: r.suc, usd });
    console.log(`  ${kg}kg (caja ${dims}cm): domicilio $${r.dom ?? '—'} | sucursal $${r.suc ?? '—'} -> FVR US$${usd}`);
  }

  // sonda volumétrica: 5kg en caja grande (60×60×60) para detectar cobro por volumen
  let volProbe = null;
  try {
    const grande = await cotizar(page, 5, 60);
    volProbe = grande;
    console.log(`  sonda volumétrica 5kg 60×60×60: domicilio $${grande.dom ?? '—'} (vs caja chica arriba)`);
  } catch {}

  await browser.close();
  if (!existsSync('./data')) await mkdir('./data', { recursive: true });
  const out = {
    generado: new Date().toISOString(),
    usdt: Math.round(rate),
    origen: 'PUERTO IGUAZU (3370)', destino: 'SAN SALVADOR DE JUJUY (4607)',
    regla: 'domicilio+5USD o sucursal+10USD, declarado 100000, pago en destino',
    divisor_volumetrico: 5000,
    sonda_volumetrica: volProbe,
    tabla,
  };
  await writeFile('./data/envios.json', JSON.stringify(out, null, 2));
  console.log(`\n✅ data/envios.json — ${tabla.length} tramos de peso cotizados`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
