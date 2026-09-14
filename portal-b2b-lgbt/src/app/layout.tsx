// src/app/layout.tsx
import { Calendar, CreditCard, LayoutDashboard, LogOut, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Portal Parceiros | Conexão LGBT+',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#0B0B0E] text-white flex h-screen overflow-hidden`}>
        
        {/* SIDEBAR LATERAL */}
        <aside className="w-64 bg-[#161520] border-r border-[#232230] flex flex-col justify-between hidden md:flex">
          <div>
            <div className="p-6">
              <h1 className="text-xl font-black text-[#E1306C]">Portal B2B</h1>
              <p className="text-[#A0A0B2] text-xs mt-1">Área do Parceiro</p>
            </div>
            
            <nav className="px-4 space-y-2 mt-4">
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#E1306C]/10 text-[#E1306C] font-bold border border-[#E1306C]/20">
                <LayoutDashboard size={18} />
                Visão Geral
              </Link>
              <Link href="/eventos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0B2] hover:bg-[#232230] hover:text-white transition">
                <Calendar size={18} />
                Meus Eventos
              </Link>
              <Link href="/lista-vip" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0B2] hover:bg-[#232230] hover:text-white transition">
                <Users size={18} />
                Lista VIP
              </Link>
              <Link href="/planos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0B2] hover:bg-[#232230] hover:text-white transition">
                <CreditCard size={18} />
                Meu Plano
              </Link>
            </nav>
          </div>

          <div className="p-4 border-t border-[#232230]">
            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#A0A0B2] hover:bg-red-500/10 hover:text-red-400 transition">
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

      </body>
    </html>
  );
}