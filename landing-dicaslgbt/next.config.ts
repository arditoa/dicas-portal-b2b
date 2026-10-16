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
  // Links curtos para divulgar por WhatsApp e redes. Redirecionamento
  // temporário (307) para o destino poder mudar sem quebrar o link.
  async redirects() {
    const portal = process.env.NEXT_PUBLIC_URL_PORTAL || 'https://dicas-portal-b2b-dun.vercel.app';
    return [
      { source: '/cadastro', destination: `${portal}/cadastro/local`, permanent: false },
      { source: '/cadastro-evento', destination: `${portal}/cadastro/evento`, permanent: false },
    ];
  },
};

export default nextConfig;
