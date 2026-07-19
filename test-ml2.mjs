import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
const page = await b.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
try {
  await page.goto('https://www.mercadolibre.com.ar', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  console.log('home URL:', page.url().slice(0, 70));
  // usar el buscador como humano
  const box = await page.$('input.nav-search-input, input[name="as_word"]');
  if (box) {
    await box.type('iphone 14 pro 256gb', { delay: 60 });
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
    await sleep(3500);
  }
  console.log('result URL:', page.url().slice(0, 70));
  const data = await page.evaluate(() => ({
    verif: location.href.includes('account-verification'),
    precios: document.querySelectorAll('.andes-money-amount__fraction').length,
    first: document.querySelector('.andes-money-amount__fraction')?.textContent,
    firstTitle: document.querySelector('.poly-component__title, h3.poly-component__title-wrapper a')?.textContent?.trim()?.slice(0,60),
  }));
  console.log(JSON.stringify(data, null, 2));
} finally { await b.close(); }
