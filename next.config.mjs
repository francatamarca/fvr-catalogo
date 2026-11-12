/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El snapshot de este despliegue debe estar disponible en todas las fichas.
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./data/catalogo.public.json.gz'],
      '/producto/[codigo]': ['./data/catalogo.public.json.gz'],
    },
  },
};
export default nextConfig;
