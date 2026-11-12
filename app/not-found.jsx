import Link from 'next/link';

export default function NotFound(){
  return <main className="container" style={{minHeight:'45vh',paddingTop:65,paddingBottom:65}}>
    <p style={{color:'#7b478b',fontSize:12,fontWeight:800,letterSpacing:1}}>CATÁLOGO FVR</p>
    <h1 style={{fontSize:28,color:'#10243e',lineHeight:1.3}}>Este producto o página ya no está disponible</h1>
    <p style={{color:'#68758b',fontSize:14,lineHeight:1.7}}>Volvé al catálogo para ver los productos disponibles en la última actualización.</p>
    <Link href="/" style={{display:'inline-block',marginTop:12,padding:'12px 20px',borderRadius:10,background:'#9755ac',color:'white',fontWeight:700,fontSize:13}}>Volver al catálogo</Link>
  </main>;
}
