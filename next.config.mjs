/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // asegura que data/catalogo.json viaje al deploy (lo leemos con fs en runtime)
  outputFileTracingIncludes: {
    '/': ['./data/**'],
    '/producto/[codigo]': ['./data/**'],
  },
};
export default nextConfig;
