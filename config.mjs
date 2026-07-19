// Configuración del catálogo FVR

// NUNCA incluir estas categorías (pedido de Francisco)
export const CATEGORIAS_EXCLUIDAS = ['comestible', 'comestibles', 'alimento', 'bebida'];

// Piso por categoría: oculta productos tan baratos que con la logística nunca le ganan a Argentina.
// AJUSTABLE por Francisco. Se evalúa sobre el precio USD de Madrid Center.
export function floorPorCategoria(cat = '') {
  const c = cat.toLowerCase();
  if (c.includes('notebook')) return 150;
  if (c.includes('tablet') || c.includes('ipad')) return 180;
  if (c.includes('celular') || c.includes('smartphone')) return 60;
  return 0;
}
export function pasaFiltroArgentina(usd, cat) {
  return usd >= floorPorCategoria(cat);
}

// ¿es un producto reacondicionado / usado? (se etiqueta, no se oculta)
export function esReacondicionado(titulo = '') {
  return /reacondicionad|refurbish|\bcpo\b|\busado\b|semi\s?nuevo/i.test(titulo);
}

// ---- Recargos fijos POR UNIDAD (mayores gastos logísticos de ciertos productos) ----
// Editable: agregar entradas cuando Francisco analice más productos grandes (ej: televisores).
export const RECARGOS = [
  { label: 'Microondas +11', usd: 11, test: (titulo, categoria) => /microond/i.test(categoria) || /microondas/i.test(titulo) },
  { label: 'iPhone 17 +10', usd: 10, test: (titulo) => /iphone\s*17/i.test(titulo) },
];
export function recargoPara(titulo = '', categoria = '') {
  let total = 0;
  for (const r of RECARGOS) if (r.test(titulo, categoria)) total += r.usd;
  return total;
}

// Sin ruta para bultos grandes por ahora: los productos de más de este peso NO se publican.
export const PESO_MAX_KG = 60;

// Clasificador de categoría-hoja (español + portugués) -> grupo de display. Orden = prioridad.
const GRUPOS = [
  { nombre: 'Perfumes', emoji: '🌸', re: /perfum|fragr|eau de|colonia|body splash|desodor/i },
  { nombre: 'Reloj', emoji: '⌚', re: /reloj|rel[oó]gio|smartwatch|\bwatch\b/i },
  { nombre: 'Motociclismo', emoji: '🏍️', re: /moto|casco|capacete|guante.*motoc/i },
  { nombre: 'Termos y Vasos Térmicos', emoji: '🥤', re: /termo|t[eé]rmic|vaso|garrafa|botella|\bmate\b|stanley/i },
  { nombre: 'Seguridad', emoji: '🛡️', re: /segur|alarma|cerradura|fechadura|cctv|\bdvr\b|monitoramento/i },
  { nombre: 'Cámaras y Drones', emoji: '📷', re: /c[âá]mera|c[áa]mara|drone|gopro|filmadora/i },
  { nombre: 'Belleza y Salud', emoji: '💄', re: /belleza|beleza|salud|sa[uú]de|maquill|maquiagem|skincare|cosm|shampoo|acondicion|cabelo|cabello|secador|prancha|escova|barbe|depil|balan[zç]a|masaj|massage|crema|creme|esmalte|u[ñn]as|unhas|cortar cabelo|cortapelo|alisad|modelador|cachos|medidor de press|body/i },
  { nombre: 'Gamer', emoji: '🎮', re: /gamer|console|playstation|\bps[45]\b|xbox|nintendo|joystick/i },
  { nombre: 'TV y Video', emoji: '📺', re: /\btv\b|televis|smart tv|v[ií]deo|controle remoto|control remoto|conversor|decod|projetor|proyector/i },
  { nombre: 'Audio', emoji: '🎧', re: /audio|[áa]udio|aud[ií]f|auricular|\bfone|headphone|headset|parlante|alto falante|caixa de som|caixas amplificad|amplificad|subwoofer|corneta|tweeter|toca mp3|\bmp3\b|microfon|micr[oó]fono|\bsom\b|r[aá]dio|soundbar/i },
  { nombre: 'Automóvil', emoji: '🚗', re: /autom|central multimedia|som automotivo|\bcarro\b|veh[ií]c|ve[ií]c|neum[aá]t|\bpneu|llanta/i },
  { nombre: 'Herramienta', emoji: '🛠️', re: /herramient|ferrament|taladro|furadeira|parafus|destornillad|amoladora|soldador|mult[ií]metro|serra\b/i },
  { nombre: 'Electrodomésticos', emoji: '🔌', re: /electrodom|eletro|licuad|liquidif|cafet|freidora|fritadeira|air ?fryer|ventilad|aspirador|fog[ãa]o|cocina|forno|horno|microond|geladeira|heladera|nevera|ferro de passar|plancha|sanduich|batedeira|batidora|tostad|torradeira|ar condicionado|aire acond|climatiz|aquecedor|umidificad|espremedor|panela|\bolla\b|ilumina|\bled\b|lanterna|linterna|pilha|pila/i },
  { nombre: 'Informática', emoji: '💻', re: /inform|computador|mouse|teclado|pen ?drive|\bssd\b|\bhd\b|memoria|mem[oó]ria|\bram\b|router|roteador|modem|\bhub\b|switch|monitor|impres|impress|fonte|fuente|adaptador|placa|processad|procesad|webcam|calculadora/i },
  { nombre: 'Accesorios y Periféricos', emoji: '🔗', re: /accesor|acess[oó]r|perif[eé]r|periferic|cable|cabos?|carregador|cargador|power bank|bateria|bater[ií]a|suporte|soporte|\bcapa\b|funda|pel[ií]cula|selfie/i },
  { nombre: 'Juguetes y Otros', emoji: '🧸', re: /juguete|brinquedo|mu[ñn]ec|bonec|\btoy/i },
];
function clasificar(leaf) {
  for (const g of GRUPOS) if (g.re.test(leaf)) return g;
  return null;
}
export function grupoDisplay(leaf = '', nameToTop = {}) {
  const l = leaf.toLowerCase();
  if (l.includes('notebook')) return { nombre: 'Notebooks', emoji: '💻' };
  if (l.includes('tablet') || l.includes('ipad')) return { nombre: 'Tablets', emoji: '📲' };
  if (l.includes('celular') || l.includes('smartphone')) return { nombre: 'Celulares', emoji: '📱' };
  return clasificar(leaf) || { nombre: 'Otros', emoji: '🛍️' };
}
export const slugify = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// API Madrid Center
export const MC_API = 'https://madridcenterimportados.com/bff/main/api/v3/productos/buscar';
export const MC_HOME = 'https://madridcenterimportados.com/home';
export const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
