import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.goto('https://catalogo.fvrlogistica.com.ar/producto/1129410', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2000);

const leer = () => page.evaluate(() => ({
  beneficio: document.querySelector('.beneficios')?.innerText.replace(/\n/g, ' · '),
  totals: [...document.querySelectorAll('.trow')].map(el => el.textContent),
}));

// subir cantidad a 20 en la ficha y agregar
await page.evaluate(() => { for (let i = 0; i < 19; i++) document.querySelectorAll('.qty-wrap .qty-btn')[1].click(); });
await sleep(400);
await page.click('.btn-buy');
await sleep(1000);
console.log('--- 20 unidades ($400, 18.6kg) ---');
console.log(JSON.stringify(await leer(), null, 2));
await page.screenshot({ path: 'hint-400.png' });

// subir a 25 en el carrito
await page.evaluate(() => { for (let i = 0; i < 5; i++) document.querySelectorAll('.cart-qtyrow .qty-btn')[1].click(); });
await sleep(800);
console.log('--- 25 unidades ($500) ---');
console.log(JSON.stringify(await leer(), null, 2));

// subir a 51 (supera 1000)
await page.evaluate(() => { for (let i = 0; i < 26; i++) document.querySelectorAll('.cart-qtyrow .qty-btn')[1].click(); });
await sleep(800);
console.log('--- 51 unidades ($1020) ---');
console.log(JSON.stringify(await leer(), null, 2));
await page.screenshot({ path: 'hint-1020.png' });
await b.close();
