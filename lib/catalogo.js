import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

// En producción la web lee el catálogo público (saneado, sin costo) hosteado en GitHub.
// En desarrollo lee el archivo local.
const REMOTE = process.env.CATALOGO_URL ||
  'https://raw.githubusercontent.com/francatamarca/fvr-catalogo/main/data/catalogo.public.json.gz';
const EMPTY = { generado: null, total: 0, categorias: [], resumen: {}, productos: [] };

let cache = null;

function readLocal() {
  const dir = path.join(process.cwd(), 'data');
  const pub = path.join(dir, 'catalogo.public.json.gz');
  const full = path.join(dir, 'catalogo.json');
  if (existsSync(pub)) return JSON.parse(gunzipSync(readFileSync(pub)).toString('utf8'));
  if (existsSync(full)) return sanitizeCatalogo(JSON.parse(readFileSync(full, 'utf8')));
  return null;
}

export async function getCatalogo() {
  // dev: archivo local (cacheado en memoria)
  if (process.env.NODE_ENV !== 'production') {
    if (cache) return cache;
    const local = readLocal();
    if (local) { cache = local; return cache; }
  }
  // prod: fetch remoto — el caché/revalidado lo maneja Next (revalidate 1800s) para reflejar el sync diario
  try {
    const r = await fetch(REMOTE, { next: { revalidate: 1800 } });
    if (!r.ok) throw new Error('fetch ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    return JSON.parse(gunzipSync(buf).toString('utf8'));
  } catch {
    return readLocal() || EMPTY;
  }
}

export async function getProducto(codigo) {
  const c = await getCatalogo();
  return c.productos.find(p => String(p.codigo) === String(codigo)) || null;
}

// ---- saneado (quita el precio de costo de Paraguay) ----
function safePrecio(pr) {
  if (pr.via === 'fija') return { via: 'fija', final_usd: pr.final_usd };
  // m25: ya tiene margen 25% aplicado por unidad (no vuelve a descontar en el pedido +US$1000)
  return { via: 'general', precio_unit_usd: pr.precio_unit_usd, m25: pr.margen === '+25%' || undefined };
}
export function clientProduct(p, full = false) {
  const base = {
    codigo: p.codigo, titulo: p.titulo, marca: p.marca, categoria: p.categoria,
    catSlug: p.catSlug, catNombre: p.catNombre, catEmoji: p.catEmoji,
    img: p.img, descuento: p.descuento, reacond: p.reacond, esNuevo: p.esNuevo, repuesto: p.repuesto,
    pesoKg: p.pesoKg ?? null, // necesarios para calcular el envío del pedido (peso real y volumétrico)
    vol: p.vol ?? null,
    precio: safePrecio(p.precio),
  };
  if (full) { base.imgs = p.imgs; base.specs = p.specs; }
  return base;
}
function sanitizeCatalogo(c) {
  return { ...c, productos: c.productos.map(p => clientProduct(p, true)) };
}

export async function getListado() {
  const c = await getCatalogo();
  return { categorias: c.categorias, generado: c.generado, productos: c.productos.map(p => clientProduct(p, false)) };
}
