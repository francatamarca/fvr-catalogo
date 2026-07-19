import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.goto('https://catalogo.fvrlogistica.com.ar/producto/1129410', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2000);

const leer = () => page.evaluate(() => ({
  beneficio: document.querySelector('.beneficios')?.innerText.replace(/\n/g, ' · '),
  filas: [...document.querySelectorAll('.trow')].map(el => el.textContent),
}));
const masEnCarrito = async (n) => {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => document.querySelectorAll('.cart-qtyrow .qty-btn')[1].click());
    await sleep(90);
  }
  await sleep(500);
};

await page.evaluate(() => { for (let i = 0; i < 19; i++) document.querySelectorAll('.qty-wrap .qty-btn')[1].click(); });
await sleep(300);
await page.click('.btn-buy'); await sleep(900);
console.log('--- $400 ---'); console.log(JSON.stringify(await leer(), null, 2));
await page.screenshot({ path: 'hint-400.png' });

await masEnCarrito(5);
console.log('--- $500 ---'); console.log(JSON.stringify(await leer(), null, 2));
await page.screenshot({ path: 'hint-500.png' });

await masEnCarrito(26);
console.log('--- $1020 ---'); console.log(JSON.stringify(await leer(), null, 2));
await page.screenshot({ path: 'hint-1020.png' });
await b.close();
