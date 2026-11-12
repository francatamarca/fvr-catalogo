import Tienda from '../components/Tienda';
import { getListado } from '../lib/catalogo';

// La nueva publicación del catálogo crea un despliegue con su snapshot completo.
export const revalidate = false;

export default async function Home() {
  const catalogo = await getListado();
  return <Tienda catalogo={catalogo} />;
}
