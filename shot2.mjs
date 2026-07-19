import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.SHOT_URL || 'http://localhost:3007';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

// Desktop
const d = await b.newPage();
await d.setViewport({ width: 1366, height: 980 });
await d.goto(URL + '/', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise(r => setTimeout(r, 3000));
await d.screenshot({ path: 'shot-desktop.png' });
await d.evaluate(() => window.scrollTo(0, 900));
await new Promise(r => setTimeout(r, 1600));
await d.screenshot({ path: 'shot-desktop2.png' });

// Mobile (iPhone-ish)
const m = await b.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(URL + '/', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise(r => setTimeout(r, 2500));
await m.screenshot({ path: 'shot-mobile.png' });
await m.evaluate(() => window.scrollTo(0, 1300));
await new Promise(r => setTimeout(r, 1500));
await m.screenshot({ path: 'shot-mobile2.png' });

// Ficha mobile
await m.goto(URL + '/producto/1150315', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise(r => setTimeout(r, 2000));
await m.screenshot({ path: 'shot-mobile-ficha.png' });

await b.close();
console.log('OK shots');
