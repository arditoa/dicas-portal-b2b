import type { Metadata } from 'next';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dicas LGBT+ — o guia que conecta experiências LGBT+ aos lugares certos',
  description:
    'Descubra bares, eventos e espaços seguros para a comunidade LGBT+, e cadastre seu local, evento ou marca para ser encontrado por quem mais quer ir.',
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
