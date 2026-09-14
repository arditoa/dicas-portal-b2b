import './globals.css';

// Força todo o App Router a compilar sem travar no 'Generating static pages'
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#111217] text-white antialiased">
        {children}
      </body>
    </html>
  );
}