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
  // Cabeçalhos de segurança (nov/2026): impedem que o portal seja embutido em outro site (clickjacking), forçam
  // HTTPS, evitam que o navegador "adivinhe" o tipo de arquivo e limitam o que vaza no Referer e quais recursos
  // do aparelho a página pode pedir. Não inclui Content-Security-Policy de propósito (exige testar cada tela).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;