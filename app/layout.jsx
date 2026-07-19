import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { RateProvider } from '../components/RateContext';
import { CartProvider } from '../components/CartContext';
import Cart from '../components/Cart';
import UsdtBar from '../components/UsdtBar';
import Logo from '../components/Logo';
import { getCatalogo } from '../lib/catalogo';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

const RAW = 'https://raw.githubusercontent.com/francatamarca/fvr-catalogo/main';
const OG = `${RAW}/app/opengraph-image.jpg`;

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://catalogo.fvrlogistica.com.ar'),
  title: 'FVR Logística Internacional — Catálogo de importación',
  description: 'Catálogo de productos importados con envío a todo el país. Precios en USDT actualizados en tiempo real.',
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
  let actualizado = null;
  try {
    const c = await getCatalogo();
    if (c.generado) actualizado = new Date(c.generado).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  } catch {}
  return (
    <html lang="es">
      <body className={jakarta.className}>
        <RateProvider>
          <CartProvider>
          <UsdtBar />
          <header className="top">
            <div className="container top-row">
              <Logo />
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
                {actualizado ? <div className="fupd">Stock y precios actualizados: {actualizado}</div> : null}
              </div>
            </div>
          </footer>
          </CartProvider>
        </RateProvider>
      </body>
    </html>
  );
}
