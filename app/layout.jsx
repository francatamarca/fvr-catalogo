import './globals.css';
import { RateProvider } from '../components/RateContext';
import UsdtBar from '../components/UsdtBar';
import Logo from '../components/Logo';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://fvr-catalogo.vercel.app'),
  title: 'FVR Logística Internacional — Catálogo de importación',
  description: 'Catálogo de productos importados con envío a todo el país. Precios en USDT actualizados en tiempo real.',
  openGraph: {
    title: 'FVR Logística Internacional — Catálogo de importación',
    description: 'Cientos de productos importados con envío a todo el país. Precios en USDT en vivo.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'FVR Logística Internacional',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <RateProvider>
          <UsdtBar />
          <header className="top">
            <div className="container top-row">
              <Logo />
            </div>
          </header>
          {children}
          <footer>
            <div className="container fl">
              <div>
                <div className="fn">FVR Logística Internacional</div>
                <div style={{ marginTop: 6 }}>Importación y envío a todo el país · Precios en USDT</div>
              </div>
              <div style={{ opacity: .7 }}>Catálogo de referencia · Los precios pueden variar según cotización y stock.</div>
            </div>
          </footer>
        </RateProvider>
      </body>
    </html>
  );
}
