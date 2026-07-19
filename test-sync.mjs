import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const API = 'https://madridcenterimportados.com/bff/main/api/v3/productos/buscar?country=py&idioma=es&limit=3&formato_completo=true&orden=relevance';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  console.log('-> navegando a la home (para pasar Cloudflare)...');
  await page.goto('https://madridcenterimportados.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Reintentar el fetch a la API hasta que Cloudflare deje pasar (o timeout)
  let ok = false;
  for (let i = 1; i <= 12; i++) {
    const res = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, { headers: { accept: 'application/json' } });
        const text = await r.text();
        return { status: r.status, isJson: text.trim().startsWith('{'), text: text.slice(0, 100000) };
      } catch (e) { return { status: -1, error: String(e) }; }
    }, API);

    if (res.status === 200 && res.isJson) {
      const data = JSON.parse(res.text);
      console.log(`\n✅ PASÓ CLOUDFLARE en intento ${i}. Productos recibidos: ${data.productos?.length}`);
      console.log('Total en catálogo:', data.estadisticas?.total_productos);
      for (const p of (data.productos || [])) {
        console.log(`  [${p.codigo}] ${p.titulo?.slice(0,55)} | USD ${p.precio?.usd} | desc ${p.precio?.descuento_porcentaje ?? '-'} | peso ${p.dimensiones?.peso}kg | stock ${p.stock?.cantidad} | ${p.categoria}`);
      }
      ok = true;
      break;
    }
    console.log(`   intento ${i}: status ${res.status}, json=${res.isJson} — esperando a Cloudflare...`);
    await sleep(2500);
  }
  if (!ok) console.log('\n❌ No se pudo pasar Cloudflare en headless. Probar headless:false.');
} finally {
  await browser.close();
}
