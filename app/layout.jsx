import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { RateProvider } from '../components/RateContext';
import { CartProvider } from '../components/CartContext';
import Cart from '../components/Cart';
import UsdtBar from '../components/UsdtBar';
import Logo from '../components/Logo';
import { getCatalogo } from '../lib/catalogo';
import {FavoritesProvider,FavoritesHeaderButton} from '../components/FavoritesContext';
import {WhatsAppIcon} from '../components/Icons';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

const RAW = 'https://raw.githubusercontent.com/francatamarca/fvr-catalogo/main';
const OG = `${RAW}/app/opengraph-image.jpg`;

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogo.fvrlogistica.com.ar'),
  title: 'FVR Logística Internacional — Catálogo de importación',
  description: 'Catálogo de productos importados con envío a todo el país. Precios en USDT y cotización del dólar en vivo.',
  icons: { icon: `${RAW}/app/icon.jpg`, apple: `${RAW}/app/icon.jpg` },
  openGraph: {
    title: 'FVR Logística Internacional — Catálogo de importación',
    description: 'Miles de productos importados con envío a todo el país. Precios en USDT en vivo.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'FVR Logística Internacional',
    images: [{ url: OG, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function RootLayout({ children }) {
  let actualizado = null, stockRevisado=null, envios = null, vigentes = [];
  try {
    const c = await getCatalogo();
    if (c.generado) actualizado = new Date(c.generado).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    if (c.stockRevisado) stockRevisado = new Date(c.stockRevisado).toLocaleString('es-AR', { timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit' });
    envios = c.envios || null;
    vigentes = c.productos.map(p => [String(p.codigo), p.precio.via,
      p.precio.via === 'fija' ? p.precio.final_usd : p.precio.precio_unit_usd,
      !!p.precio.m25, p.pesoKg??null, p.vol??null]);
  } catch {}
  return (
    <html lang="es">
      <body className={jakarta.className}>
        <RateProvider>
          <CartProvider envios={envios} vigentes={vigentes}>
          <FavoritesProvider>
          <UsdtBar />
          <header className="top">
            <div className="container top-row">
              <Logo />
              <div className="header-actions"><FavoritesHeaderButton/><a className="contact-top" href="https://wa.me/543883372745" target="_blank" rel="noreferrer"><WhatsAppIcon/> <span>WhatsApp FVR</span></a></div>
            </div>
          </header>
          {children}
          <Cart />
          <footer>
            <div className="container fl">
              <div>
                <div className="fn">FVR Logística Internacional</div>
                <div className="fs">Importación y envío a todo el país · Precios en USDT</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: .8 }}>Catálogo de referencia · Los precios pueden variar según cotización y stock.</div>
                {stockRevisado ? <div className="fupd">Disponibilidad revisada: {stockRevisado}</div> : null}
                {actualizado ? <div className="fupd">Precios de referencia: {actualizado}</div> : null}
                <a className="footer-whatsapp" href="https://wa.me/543883372745" target="_blank" rel="noreferrer">Contactar a FVR por WhatsApp →</a>
              </div>
            </div>
          </footer>
          </FavoritesProvider>
          </CartProvider>
        </RateProvider>
      </body>
    </html>
  );
}
