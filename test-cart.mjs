import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.SHOT_URL || 'http://localhost:3007';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.setViewport({ width: 1366, height: 980 });
await page.goto(URL + '/', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2500);
await page.screenshot({ path: 'v3-hero.png' });

// agregar 2 unidades del primer producto y 1 del segundo
const botones = await page.$$('.btn-add');
console.log('botones agregar visibles:', botones.length);
await botones[0].click(); await sleep(600);
// el carrito se abre solo; cerrarlo para seguir agregando
await page.click('.cart-close'); await sleep(400);
await botones[0].click(); await sleep(500);
await page.click('.cart-close'); await sleep(400);
await botones[1].click(); await sleep(800);

// estado del carrito
const cart = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.cart-item')].map(el => ({
    nombre: el.querySelector('.cart-name')?.textContent?.slice(0, 40),
    qty: el.querySelector('.qty-num')?.textContent,
    linea: el.querySelector('.cart-line')?.textContent,
  }));
  const totals = [...document.querySelectorAll('.trow')].map(el => el.textContent);
  const min = document.querySelector('.cart-min')?.textContent || document.querySelector('.cart-ok')?.textContent;
  return { rows, totals, min };
});
console.log(JSON.stringify(cart, null, 2));
await page.screenshot({ path: 'v3-cart.png' });

// mobile
const m = await b.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(URL + '/', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2200);
await m.screenshot({ path: 'v3-mobile.png' });
await b.close();
console.log('OK');
