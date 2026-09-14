import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Portal B2B - Dicas Trip LGBT+',
  description: 'Gerencie seu espaço e parceiros no maior portal LGBT+ de turismo e lazer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#111217] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}