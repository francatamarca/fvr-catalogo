/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // asegura que el catálogo saneado local esté disponible como respaldo en runtime
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./data/catalogo.public.json.gz'],
      '/producto/[codigo]': ['./data/catalogo.public.json.gz'],
    },
  },
};
export default nextConfig;
