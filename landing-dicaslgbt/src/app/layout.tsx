import type { Metadata } from 'next';
import './globals.css';
import { URL_SITE } from '../lib/constants';

export const dynamic = 'force-dynamic';

// Rodada 59 — Andrea confirmou o domínio definitivo (www.dicaslgbt.com.br).
// metadataBase resolve URLs relativas de Open Graph/Twitter card pro
// domínio certo (sem isso, o Next usa localhost como base em previews e
// o link social sai quebrado); openGraph básico adicionado agora que o
// domínio é conhecido — nenhuma imagem de capa própria ainda (og:image
// cai no padrão do Next, sem imagem), pode ser refinado depois.
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: 'Dicas LGBT+ — o guia que conecta experiências LGBT+ aos lugares certos',
  description:
    'Descubra bares, eventos e espaços seguros para a comunidade LGBT+, e cadastre seu local, evento ou marca para ser encontrado por quem mais quer ir.',
  openGraph: {
    title: 'Dicas LGBT+',
    description:
      'Cadastre gratuitamente seu negócio e esteja entre as primeiras empresas do Dicas LGBT+ App.',
    url: URL_SITE,
    siteName: 'Dicas LGBT+',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0B0B0E] text-white antialiased">{children}</body>
    </html>
  );
}
