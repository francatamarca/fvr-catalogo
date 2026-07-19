import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.goto('https://madridcenterimportados.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
async function get(u) {
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate(async u => { try { const r = await fetch(u, { headers: { accept: 'application/json' } }); const t = await r.text(); return { s: r.status, j: t.trim().startsWith('{'), t }; } catch (e) { return { s: -1 }; } }, u);
    if (r.s === 200 && r.j) return JSON.parse(r.t);
    await sleep(1500);
  }
  return null;
}
const base = 'https://madridcenterimportados.com/bff/main/api/v3/productos/buscar?country=py&idioma=es&limit=3&formato_completo=true';
for (const param of ['categoria_id=577', 'categorias=577', 'categoria=577', 'categoria_slug=notebook', 'categorias_ids=577', 'subcategoria_id=577', 'q=notebook']) {
  const d = await get(base + '&' + param);
  console.log(param.padEnd(28), '->', d?.productos?.length ?? 'null', 'prods; 1a cat:', d?.productos?.[0]?.categoria ?? '-');
}
await b.close();
