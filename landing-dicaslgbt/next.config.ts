import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Mesmo motivo do portal-b2b-lgbt: evita o Next escanear o monorepo
  // inteiro (app mobile + node_modules dele) procurando arquivo por
  // engano, só porque há mais de um package-lock.json acima desta pasta.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
