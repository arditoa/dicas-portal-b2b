import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import MobileFixedCta from '../../components/MobileFixedCta';

export const dynamic = 'force-dynamic';

// Rodada 58 — Guia, Seção 4 "Página Sobre o Dicas LGBT+" (URL /sobre).
// Textos exatos do documento, 6 blocos na ordem indicada.

const NUMEROS = [
  { destaque: 'Quase 5 anos', texto: 'de atuação' },
  { destaque: 'Mais de 100', texto: 'empresas atendidas' },
  { destaque: '35 mil', texto: 'pessoas no Instagram' },
  { destaque: 'Cerca de 1 milhão', texto: 'de impressões mensais' },
];

const ECOSSISTEMA = [
  'Conteúdo e redes sociais',
  'Dicas LGBT+ App',
  'Dicas Trip',
  'Conexão com empresas e instituições',
];

export default function SobrePage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white pb-24 sm:pb-0">
      <Header />

      {/* 1. Hero — Andrea achou "muito branco" o topo desta página (fundo
          preto liso + título todo branco, sem nenhuma cor até chegar nos
          Números). Adicionei o mesmo brilho radial rosa/roxo que já está
          no topo da Home, e o título ganhou o efeito gradiente que ela
          confirmou que gosta (mesmo usado nos Números) — mesma ideia
          visual, sem trocar uma palavra do texto do Guia. */}
      <section className="relative w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          style={{
            background:
              'radial-gradient(55% 60% at 50% -10%, rgba(225,48,108,0.20), rgba(126,87,194,0.10) 45%, transparent 75%)',
          }}
          aria-hidden
        />
        <div className="relative w-full max-w-3xl mx-auto text-center px-6 pt-14 pb-14">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight gradient-text">
            Informação que aproxima. Experiências que fazem a gente pertencer.
          </h1>
          <p className="text-[#A0A0B2] text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
            O Dicas LGBT+ conecta comunidade, lugares, eventos, marcas e destinos por meio de conteúdo,
            experiências e tecnologia.
          </p>
        </div>
      </section>

      {/* 2. História */}
      <section className="w-full max-w-3xl mx-auto px-6 py-14 border-t border-white/5 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Uma história construída com a comunidade.</h2>
        <p className="text-[#A0A0B2] text-sm sm:text-base leading-relaxed">
          Quase 5 anos de atuação e a retomada do perfil em 2026 como sinal de força e reconstrução.
        </p>
      </section>

      {/* 3. Números — Andrea confirmou que gostou do efeito gradiente
          rosa→roxo (voltou atrás de um ajuste anterior que tinha trocado
          por rosa sólido); o pedido real era sobre o topo da página, não
          esta seção. */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-white/5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {NUMEROS.map((n) => (
            <div key={n.destaque}>
              <div className="text-xl sm:text-2xl font-black gradient-text">{n.destaque}</div>
              <div className="text-xs text-[#A0A0B2] mt-1">{n.texto}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Ecossistema */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-white/5">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center">O ecossistema Dicas LGBT+</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ECOSSISTEMA.map((e) => (
            <div key={e} className="bg-[#161520] border border-[#232230] rounded-2xl p-5 text-center text-sm font-semibold text-[#D0D0E0]">
              {e}
            </div>
          ))}
        </div>
      </section>

      {/* 5. Propósito */}
      <section className="w-full max-w-3xl mx-auto px-6 py-14 border-t border-white/5 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">Mais escolhas, mais visibilidade, mais pertencimento.</h2>
      </section>

      {/* 6. CTAs */}
      <section className="w-full max-w-3xl mx-auto px-6 py-14 border-t border-white/5 text-center flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/app" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition">
          Conhecer o aplicativo
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/#cadastro" className="inline-flex items-center justify-center gap-2 bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition">
          Cadastrar minha empresa
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <Footer />
      <MobileFixedCta variant="lancamento" />
    </main>
  );
}
