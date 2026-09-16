import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Evita o Next escanear o monorepo inteiro (app mobile + node_modules
  // dele) procurando arquivo por engano, só porque há mais de um
  // package-lock.json acima desta pasta — deixa o build rápido e sem o
  // aviso de "workspace root incerto".
  outputFileTracingRoot: __dirname,
};

export default nextConfig;