import Link from 'next/link';

export const RAW_BASE = 'https://raw.githubusercontent.com/francatamarca/fvr-catalogo/main';

export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="FVR Logística Internacional">
      <span className="logo-tile"><img src={`${RAW_BASE}/public/logo-fvr.jpg`} alt="FVR" className="logo-img" /></span>
      <span className="logo-txt">
        <span className="n">FVR <em>Logística</em></span>
        <span className="s">Internacional</span>
      </span>
    </Link>
  );
}
