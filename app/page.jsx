import Tienda from '../components/Tienda';
import { getListado } from '../lib/catalogo';

export const revalidate = 1800; // re-lee el catálogo cada 30 min (refleja el sync diario)

export default async function Home() {
  const catalogo = await getListado();
  return <Tienda catalogo={catalogo} />;
}
