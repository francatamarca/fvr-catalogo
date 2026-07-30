import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();

// Ficha Partybox 720 (US$1.000 exactos — el caso del bug)
await page.goto('https://catalogo.fvrlogistica.com.ar/producto/1092363', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2000);
const ficha = await page.evaluate(() => ({
  old: document.querySelector('.price-old')?.textContent,
  precio: document.querySelector('.bigprice')?.textContent,
  tag: document.querySelector('.tag-mayor')?.textContent,
}));
console.log('FICHA Partybox 720 ($1000 exactos):', JSON.stringify(ficha));
await page.screenshot({ path: 'mayor-720.png' });

// agregar al carrito y verificar consistencia
await page.click('.btn-buy'); await sleep(1000);
const cart = await page.evaluate(() => ({
  filas: [...document.querySelectorAll('.trow')].map(el => el.textContent),
  beneficio: document.querySelector('.beneficios')?.innerText.split('\n')[0],
}));
console.log('CARRITO:', JSON.stringify(cart, null, 1));
await page.screenshot({ path: 'mayor-720-cart.png' });

// Ficha Partybox Ultimate ($1.398)
await page.goto('https://catalogo.fvrlogistica.com.ar/producto/932974', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2000);
const f2 = await page.evaluate(() => ({
  old: document.querySelector('.price-old')?.textContent,
  precio: document.querySelector('.bigprice')?.textContent,
}));
console.log('FICHA Ultimate ($1398):', JSON.stringify(f2));

// hero: cartel nuevo
await page.goto('https://catalogo.fvrlogistica.com.ar/', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2000);
const hero = await page.evaluate(() => [...document.querySelectorAll('.hero-marks .mark')].map(m => m.textContent.trim()).slice(4));
console.log('HERO últimos carteles:', JSON.stringify(hero));
await b.close();
