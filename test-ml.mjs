import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
const page = await b.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
const q = 'iphone 14 pro 256gb';
const url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(q).replace(/%20/g,'-')}_OrderId_PRICE_NoIndex_True#D[A:${encodeURIComponent(q)}]`;
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3500));
  const finalURL = page.url();
  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('li.ui-search-layout__item, div.ui-search-result__wrapper')].slice(0, 6).map(el => {
      const title = el.querySelector('.poly-component__title, h2, .ui-search-item__title')?.textContent?.trim();
      const frac = el.querySelector('.andes-money-amount__fraction')?.textContent?.trim();
      return { title, price: frac };
    });
    return { count: document.querySelectorAll('.andes-money-amount__fraction').length, items };
  });
  console.log('finalURL:', finalURL.slice(0, 80));
  console.log('precios en pagina:', data.count);
  console.log(JSON.stringify(data.items, null, 2));
} finally { await b.close(); }
