import { notFound } from 'next/navigation';
import Ficha from '../../../components/Ficha';
import { getProducto, clientProduct } from '../../../lib/catalogo';

export const revalidate = 1800;

export async function generateMetadata({ params }) {
  const p = await getProducto(params.codigo);
  return { title: p ? `${p.titulo} — FVR Logística` : 'Producto — FVR Logística' };
}

export default async function ProductoPage({ params }) {
  const p = await getProducto(params.codigo);
  if (!p) notFound();
  return <Ficha p={clientProduct(p, true)} />;
}
