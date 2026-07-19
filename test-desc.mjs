import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.goto('https://catalogo.fvrlogistica.com.ar/', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2500);
// agregar 5 unidades del primer producto de ofertas (US$244 c/u -> US$1220 > 1000)
const botones = await page.$$('.btn-add');
for (let i = 0; i < 5; i++) {
  await botones[0].click(); await sleep(500);
  if (i < 4) { await page.click('.cart-close'); await sleep(300); }
}
await sleep(800);
const data = await page.evaluate(() => ({
  totals: [...document.querySelectorAll('.trow')].map(el => el.textContent),
  aviso: document.querySelector('.cart-min, .cart-ok, .cart-hint')?.textContent,
}));
console.log(JSON.stringify(data, null, 2));
await page.screenshot({ path: 'desc-1000.png' });
await b.close();
