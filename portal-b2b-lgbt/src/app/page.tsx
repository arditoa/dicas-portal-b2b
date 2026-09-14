import { ArrowRight, Building2, Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#111217] text-white flex flex-col justify-between p-4 md:p-8">
      {/* Header com Logo Oficial */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Altere o src para o caminho correto da sua logo na pasta /public */}
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5">
            <div className="w-full h-full bg-[#111217] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-pink-400" />
            </div>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Portal B2B <span className="text-pink-500">LGBT+</span>
          </span>
        </div>

        <Link
          href="/login"
          className="text-sm font-medium bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl border border-white/10 transition"
        >
          Área do Parceiro
        </Link>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-4xl mx-auto text-center my-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold tracking-wide uppercase">
          Onboarding de Parceiros
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Conecte sua empresa ao público <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-400">LGBT+</span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
          Escolha o perfil do seu negócio abaixo para cadastrar seu estabelecimento, evento ou instituição e garantir visibilidade no portal oficial.
        </p>
      </section>

      {/* Grid de Cards de Seleção */}
      <section className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
        {/* Card 1: Local / Estabelecimento */}
        <Link
          href="/cadastro/local"
          className="group relative bg-[#181920] border border-white/10 hover:border-pink-500/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Local / Comércio</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Bares, restaurantes, hotéis, lojas e serviços amigáveis e seguros para a comunidade.
            </p>
          </div>
          <div className="mt-8 flex items-center text-xs font-semibold text-pink-400 group-hover:text-pink-300 gap-2">
            Cadastrar Estabelecimento
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Evento */}
        <Link
          href="/cadastro/evento"
          className="group relative bg-[#181920] border border-white/10 hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Eventos & Festas</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Festas, festivais, feiras culturais, conferências e encontros voltados ao público.
            </p>
          </div>
          <div className="mt-8 flex items-center text-xs font-semibold text-purple-400 group-hover:text-purple-300 gap-2">
            Cadastrar Evento
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Institucional / ONG */}
        <Link
          href="/cadastro/institucional"
          className="group relative bg-[#181920] border border-white/10 hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Institucional / ONG</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Organizações, projetos sociais e instituições parceiras de apoio e visibilidade.
            </p>
          </div>
          <div className="mt-8 flex items-center text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 gap-2">
            Cadastrar Instituição
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* Footer Simples */}
      <footer className="w-full max-w-5xl mx-auto border-t border-white/10 pt-6 mt-12 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Guia & Portal B2B LGBT+. Todos os direitos reservados.
      </footer>
    </main>
  );
}