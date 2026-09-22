import { ArrowRight, Calendar, Map as MapIcon, Plane, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import MobileFixedCta from '../../components/MobileFixedCta';

export const dynamic = 'force-dynamic';

// Rodada 58 — Guia, Seção 5 "Página Dicas LGBT+ App" (URL /app). Textos
// exatos do documento.

const TELAS = [
  { nome: 'Início', legenda: 'Destaques, categorias e sugestões do que fazer hoje.', icone: Sparkles },
  { nome: 'Mapa', legenda: 'Lugares organizados por proximidade, categoria e experiência.', icone: MapIcon },
  { nome: 'Agenda', legenda: 'Festas, eventos e programações por data.', icone: Calendar },
  { nome: 'Dicas Trip', legenda: 'Destinos, hospedagens, roteiros e experiências.', icone: Plane },
  { nome: 'Perfil', legenda: 'Favoritos, cupons, indicações e preferências.', icone: User },
];

const RECURSOS = ['Mapa', 'Categorias', 'Filtros', 'Favoritos', 'Agenda', 'Avaliações', 'Indicações', 'Cupons', 'Listas VIP'];
const CATEGORIAS = ['Bares', 'Gastronomia', 'Festas', 'Cultura', 'Turismo', 'Serviços', 'Experiências'];

export default function AppPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white pb-24 sm:pb-0">
      <Header />

      {/* Hero */}
      <section className="w-full max-w-3xl mx-auto text-center px-6 pt-14 pb-14">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          Seu próximo lugar favorito pode estar a um clique.
        </h1>
        <p className="text-[#A0A0B2] text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
          Vem aí um novo jeito de descobrir lugares, festas, eventos, destinos e experiências que
          combinam com você.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/lancamento" className="inline-flex items-center justify-center gap-2 bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition">
            Entrar na lista de lançamento
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/#cadastro" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition">
            Cadastrar minha empresa
          </Link>
        </div>
      </section>

      {/* Proposta */}
      <section className="w-full max-w-3xl mx-auto px-6 py-14 border-t border-[#232230] text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Tudo o que você procura em um só lugar.</h2>
        <p className="text-[#A0A0B2] text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
          Descubra, escolha, salve e planeje experiências — do rolê de hoje à próxima viagem.
        </p>
      </section>

      {/* Telas */}
      <section className="w-full max-w-6xl mx-auto px-6 py-14 border-t border-[#232230]">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {TELAS.map((t) => (
            <div key={t.nome} className="bg-[#161520] border border-[#232230] rounded-2xl p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#7E57C2]/10 border border-[#7E57C2]/20 flex items-center justify-center text-[#7E57C2] mb-4">
                <t.icone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm mb-1.5">{t.nome}</h3>
              <p className="text-[#A0A0B2] text-[11px] leading-relaxed">{t.legenda}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-[#232230]">
        <h2 className="text-xl font-extrabold mb-5 text-center">Recursos</h2>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {RECURSOS.map((r) => (
            <span key={r} className="text-xs font-semibold text-[#D0D0E0] bg-[#161520] border border-[#232230] rounded-full px-4 py-2">
              {r}
            </span>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-[#232230]">
        <h2 className="text-xl font-extrabold mb-5 text-center">Categorias</h2>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {CATEGORIAS.map((c) => (
            <span key={c} className="text-xs font-semibold text-[#D0D0E0] bg-[#161520] border border-[#232230] rounded-full px-4 py-2">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Para usuários / Para empresas */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-[#232230] grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold mb-2">Para usuários</h3>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Descoberta por proximidade, preferências, programação e experiências.
          </p>
        </div>
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold mb-2">Para empresas</h3>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Perfil, presença no mapa, agenda, contatos e oportunidades de visibilidade.
          </p>
        </div>
      </section>

      {/* Lançamento */}
      <section className="w-full max-w-3xl mx-auto px-6 py-14 border-t border-[#232230] text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-6">O app ainda está a caminho das lojas.</h2>
        <Link href="/lancamento" className="inline-flex items-center gap-2 bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition">
          Quero ser avisado(a)
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <Footer />
      <MobileFixedCta variant="lancamento" />
    </main>
  );
}
