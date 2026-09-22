import { ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { URL_PORTAL } from '../../lib/constants';

export const dynamic = 'force-dynamic';

// Rodada 58 — Guia, Seção 8 "Área do Parceiro" (URL /entrar). O Guia pede
// um formulário de e-mail/senha aqui — mas o login de verdade (com
// autenticação real via Supabase) já existe e funciona em
// ${URL_PORTAL}/login. Construir um SEGUNDO formulário de senha aqui,
// sem autenticação de verdade por trás, seria enganoso (pareceria
// funcionar mas não logaria ninguém). Por isso esta página é uma ponte:
// mesmo título/texto do Guia, botão "Entrar" leva direto pro login real.

export default function EntrarPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <Header />

      <section className="w-full max-w-md mx-auto text-center px-6 pt-16 pb-24">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#7E57C2]/10 border border-[#7E57C2]/20 items-center justify-center mb-6">
          <LogIn className="w-7 h-7 text-[#7E57C2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Área do Parceiro</h1>
        <p className="text-[#A0A0B2] text-sm mt-4 leading-relaxed">
          Entre para acompanhar seu cadastro, atualizar informações e enviar eventos.
        </p>

        <Link
          href={`${URL_PORTAL}/login`}
          className="inline-flex items-center justify-center gap-2 mt-8 w-full bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition"
        >
          Entrar
          <ArrowRight className="w-4 h-4" />
        </Link>

        <div className="flex flex-col gap-2 mt-6 text-xs">
          <Link href={`${URL_PORTAL}/login`} className="text-[#A0A0B2] hover:text-white transition">
            Esqueci minha senha
          </Link>
          <Link href="/#cadastro" className="text-[#A0A0B2] hover:text-white transition">
            Ainda não me cadastrei
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
