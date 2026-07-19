import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const logo = 'data:image/jpeg;base64,' + readFileSync('public/logo-fvr.jpg').toString('base64');

const html = `<!doctype html><html><head><meta charset="utf8"><style>
*{margin:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
.wrap{width:1200px;height:630px;background:linear-gradient(135deg,#0c2340 0%,#143a6b 100%);display:flex;align-items:center;padding:0 90px;gap:56px;color:#fff}
.logo{width:300px;height:300px;border-radius:36px;background:#fff;padding:20px;flex-shrink:0;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.logo img{width:100%;height:100%;object-fit:contain}
h1{font-size:66px;line-height:1.05;font-weight:800;letter-spacing:-1px}
h1 .o{color:#ff8a33}
p{font-size:32px;color:#cdd8ea;margin-top:22px;font-weight:500}
.pill{display:inline-block;margin-top:30px;background:#ff7a1a;color:#fff;font-size:26px;font-weight:700;padding:12px 26px;border-radius:999px}
</style></head><body>
<div class="wrap">
  <div class="logo"><img src="${logo}"/></div>
  <div>
    <h1>FVR <span class="o">Logística</span><br>Internacional</h1>
    <p>Catálogo de importación · Envío a todo el país</p>
    <span class="pill">Precios en USDT · actualizados en vivo</span>
  </div>
</div></body></html>`;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.screenshot({ path: 'app/opengraph-image.jpg', type: 'jpeg', quality: 90 });
await page.screenshot({ path: 'app/twitter-image.jpg', type: 'jpeg', quality: 90 });
await b.close();
console.log('OG generado');
