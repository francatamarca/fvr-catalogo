import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="FVR Logística Internacional">
      <img src="/logo-fvr.jpg" alt="FVR Logística Internacional" className="logo-img" />
      <div className="logo-txt">
        <div className="n">FVR Logística</div>
        <div className="s">Internacional</div>
      </div>
    </Link>
  );
}
