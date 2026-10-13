import type { Metadata } from 'next';
import './globals.css';
import { URL_SITE } from '../lib/constants';
import Analytics from '../components/Analytics';
import { fontDisplay, fontMarker } from '../lib/fonts';

export const dynamic = 'force-dynamic';

// Rodada 59 — Andrea confirmou o domínio definitivo (www.dicaslgbt.com.br).
// metadataBase resolve URLs relativas de Open Graph/Twitter card pro
// domínio certo (sem isso, o Next usa localhost como base em previews e
// o link social sai quebrado); openGraph básico adicionado agora que o
// domínio é conhecido — nenhuma imagem de capa própria ainda (og:image
// cai no padrão do Next, sem imagem), pode ser refinado depois.
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: {
    default: 'Dicas LGBT+ | Cadastre sua empresa no mapa LGBTQIA+',
    template: '%s | Dicas LGBT+',
  },
  description:
    'Cadastre sua empresa gratuitamente e esteja entre os primeiros lugares no mapa do Dicas LGBT+, o guia de lugares, eventos e experiências LGBTQIA+ do Brasil.',
  applicationName: 'Dicas LGBT+',
  openGraph: {
    title: 'Dicas LGBT+ | Sua empresa entre os primeiros lugares no mapa',
    description:
      'Cadastro gratuito, de 2 a 5 minutos e sujeito à análise. Faça parte do guia de lugares, eventos e experiências LGBTQIA+ do Brasil.',
    url: URL_SITE,
    siteName: 'Dicas LGBT+',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/og-dicas-lgbt.png',
        width: 1200,
        height: 630,
        alt: 'Dicas LGBT+ — sua empresa pode estar entre os primeiros lugares no mapa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dicas LGBT+ | Sua empresa entre os primeiros lugares no mapa',
    description:
      'Cadastro gratuito, de 2 a 5 minutos e sujeito à análise. Faça parte do guia de lugares, eventos e experiências LGBTQIA+ do Brasil.',
    images: ['/og-dicas-lgbt.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${fontDisplay.variable} ${fontMarker.variable} bg-[#0B0B0E] text-white antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
