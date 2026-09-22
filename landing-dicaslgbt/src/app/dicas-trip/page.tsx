import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import MobileFixedCta from '../../components/MobileFixedCta';

export const dynamic = 'force-dynamic';

// Rodada 58 — Guia, Seção 6 "Página Dicas Trip" (URL /dicas-trip). Textos
// exatos do documento.

const CATEGORIAS = ['Destinos', 'Hotéis e pousadas', 'Agências', 'Guias', 'Passeios', 'Restaurantes', 'Festas e eventos', 'Experiências'];

export default function DicasTripPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white pb-24 sm:pb-0">
      <Header />

      {/* Hero */}
      <section className="w-full max-w-3xl mx-auto text-center px-6 pt-14 pb-14">
        <span className="text-xs font-bold text-[#4CAF7D] uppercase tracking-wide">Do rolê à viagem</span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mt-3">
          Viaje sem precisar diminuir quem você é.
        </h1>
        <p className="text-[#A0A0B2] text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
          O Dicas Trip será a área de turismo do Dicas LGBT+ App, conectando viajantes a destinos,
          hospedagens, roteiros, eventos e experiências.
        </p>
      </section>

      {/* Categorias */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-white/5">
        <div className="flex flex-wrap gap-2.5 justify-center">
          {CATEGORIAS.map((c) => (
            <span key={c} className="text-xs font-semibold text-[#D0D0E0] bg-[#161520] border border-[#232230] rounded-full px-4 py-2">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Para quem viaja / Para o turismo */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold mb-2">Para quem viaja</h3>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Descubra onde ficar, o que fazer e quais experiências combinam com você.
          </p>
        </div>
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold mb-2">Para o turismo</h3>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Apresente seu negócio a pessoas que procuram viajar com mais informação, liberdade e
            pertencimento.
          </p>
        </div>
      </section>

      {/* CTAs */}
      <section className="w-full max-w-3xl mx-auto px-6 py-14 border-t border-white/5 text-center flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/lancamento" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition">
          Quero acompanhar o lançamento
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/#cadastro" className="inline-flex items-center justify-center gap-2 bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition">
          Cadastrar meu negócio de turismo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <Footer />
      <MobileFixedCta variant="lancamento" />
    </main>
  );
}
