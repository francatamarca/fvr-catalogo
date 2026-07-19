import puppeteer from 'puppeteer-core';
import { precioFVR } from './pricing.mjs';

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// categorías clave (id) — notebook 577, tablet 603, celular 514, perfume 936, audífono 538
const CATS = [
  { id: 577, label: 'NOTEBOOK (fija)' },
  { id: 603, label: 'TABLET (fija)' },
  { id: 514, label: 'CELULAR (fija)' },
  { id: 936, label: 'PERFUME (general +35%)' },
  { id: 538, label: 'AUDÍFONO (general +35%)' },
];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.goto('https://madridcenterimportados.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });

  async function apiGet(url) {
    for (let i = 0; i < 10; i++) {
      const res = await page.evaluate(async (u) => {
        try { const r = await fetch(u, { headers: { accept: 'application/json' } });
          const t = await r.text(); return { s: r.status, j: t.trim().startsWith('{'), t }; }
        catch (e) { return { s: -1 }; }
      }, url);
      if (res.s === 200 && res.j) return JSON.parse(res.t);
      await sleep(2000);
    }
    return null;
  }

  for (const cat of CATS) {
    const url = `https://madridcenterimportados.com/bff/main/api/v3/productos/buscar?country=py&idioma=es&categoria_id=${cat.id}&limit=5&orden=relevance&formato_completo=true`;
    const data = await apiGet(url);
    const prods = data?.productos || [];
    console.log(`\n================  ${cat.label}  (${prods.length} muestras)  ================`);
    for (const p of prods) {
      const r = precioFVR({ usd: p.precio?.usd, categoria: p.categoria, marca: p.marca, pesoKg: p.dimensiones?.peso ?? null });
      const t = (p.titulo || '').slice(0, 48).padEnd(48);
      const desc = p.precio?.descuento_porcentaje ? ` [DESC ${p.precio.descuento_porcentaje}%]` : '';
      if (r.via === 'fija') {
        console.log(`  ${t} | Madrid USD ${String(p.precio?.usd).padStart(7)} -> FVR $${r.final_usd}  (fija +$${r.logistica_usd}${r.alta_gama ? ', alta gama' : ''}, envío incluido)${desc}`);
      } else {
        const fleteTxt = r.flete_consultar ? 'flete CONSULTAR (>15kg)' : `+$${r.flete_usd} flete${r.flete_estimado ? ' (peso s/dato)' : ''}`;
        const uno = r.final_1u_usd == null ? 'consultar' : `$${r.final_1u_usd}`;
        console.log(`  ${t} | Madrid USD ${String(p.precio?.usd).padStart(7)} -> FVR $${r.precio_unit_usd}/u ${fleteTxt} | 1u=${uno} | combo ${r.combo.unidades}u=$${r.combo.subtotal_usd} envío gratis${desc}`);
      }
    }
  }
} finally {
  await browser.close();
}
