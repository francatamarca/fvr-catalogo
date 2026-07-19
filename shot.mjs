import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.setViewport({ width: 1366, height: 950, deviceScaleFactor: 1 });
await page.goto('http://localhost:3007/', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
await page.screenshot({ path: 'preview-home.png', fullPage: false });
// una segunda toma un poco más abajo para ver más productos
await page.evaluate(() => window.scrollTo(0, 620));
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: 'preview-home2.png', fullPage: false });
// ficha de producto
await page.goto('http://localhost:3007/producto/1150315', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: 'preview-ficha.png', fullPage: false });
await b.close();
console.log('OK screenshots');
