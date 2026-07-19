import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
await page.goto('https://madridcenterimportados.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });

async function get(u) {
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate(async u => { try { const r = await fetch(u, { headers: { accept: 'application/json' } }); const t = await r.text(); return { s: r.status, j: t.trim().startsWith('{'), t }; } catch { return { s: -1 }; } }, u);
    if (r.s === 200 && r.j) return JSON.parse(r.t);
    await sleep(1500);
  }
  return null;
}
const base = 'https://madridcenterimportados.com/bff/main/api/v3/productos/buscar?limit=4&formato_completo=true&solo_con_stock=true';
for (const [label, cookie, q] of [
  ['cookie br', 'br', '&country=py&idioma=es'],
  ['cookie py', 'py', '&country=py&idioma=es'],
  ['cookie ar', 'ar', '&country=ar&idioma=es'],
]) {
  await page.setCookie({ name: 'mc_country', value: cookie, domain: 'madridcenterimportados.com' });
  const d = await get(base + q);
  const cats = (d?.productos || []).map(p => p.categoria);
  console.log(label, '->', JSON.stringify(cats));
}
await b.close();
