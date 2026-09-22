import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import MobileFixedCta from '../../components/MobileFixedCta';
import { WHATSAPP_COMERCIAL, linkWhatsapp } from '../../lib/constants';

export const dynamic = 'force-dynamic';

// Rodada 58 — Guia, Seção 3 "Página Parceiro Fundador" (URL /parceiro-fundador).
// Textos mantidos exatamente como no documento.
//
// Rodada 59 — Andrea confirmou que ESTE preço (R$3.490 à vista / 12x
// R$349) é o correto, e que o "R$3.500/mês" que aparecia em /planos e no
// /admin do portal estava equivocado — não é mais uma colisão em aberto,
// já corrigido nos dois lugares pra bater com esta página.
//
// Rodada 59 (parte 2) — o "Lote 1 | 10 oportunidades" desta página x "5
// vagas no total" em /planos e na home do site: Andrea confirmou "10
// oportunidades" como o número certo. /planos e a home corrigidos pra
// bater com esta página (esta página não mudou, já estava certa).

const BENEFICIOS = [
  '12 meses de presença Premium no aplicativo.',
  'Selo digital Parceiro Fundador 2026 e presença coletiva de destaque.',
  'Perfil configurado pela equipe, com texto comercial, organização de fotos e links.',
  'Material de reconhecimento com selo, adesivo, QR Code e brinde exclusivo.',
  'Mastermind mensal em grupo e Conselho de Fundadores trimestral.',
  'Acesso antecipado a testes, novas funções e oportunidades do Dicas Trip.',
  'Condição especial em vídeo, fotografia, treinamento e primeira renovação.',
  'Carrossel individual em colaboração com o Dicas LGBT+.',
];

const FAQ = [
  {
    p: 'O cadastro gratuito continua existindo?',
    r: 'Sim. O Parceiro Fundador é uma modalidade especial, com benefícios e participação ampliados.',
  },
  {
    p: 'Como faço para participar?',
    r: 'Clique em "Quero ser Parceiro Fundador" e fale com a equipe comercial.',
  },
  {
    p: 'Quando os benefícios começam?',
    r: 'A equipe apresentará o cronograma e os próximos passos durante o atendimento.',
  },
];

function BotaoWhatsapp() {
  if (!WHATSAPP_COMERCIAL) {
    return (
      <p className="text-xs text-[#FFD54F] bg-[#FFD54F]/10 border border-[#FFD54F]/20 rounded-xl p-3 inline-block">
        WhatsApp comercial ainda não configurado (NEXT_PUBLIC_WHATSAPP_COMERCIAL no .env).
      </p>
    );
  }
  return (
    <a
      href={linkWhatsapp(WHATSAPP_COMERCIAL, 'Olá! Quero ser Parceiro Fundador do Dicas LGBT+.')}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-[#FFD54F] hover:bg-[#f0c53e] text-black font-bold text-sm px-6 py-3.5 rounded-xl transition"
    >
      <MessageCircle className="w-4 h-4" />
      Quero ser Parceiro Fundador
    </a>
  );
}

export default function ParceiroFundadorPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white pb-24 sm:pb-0">
      <Header />

      {/* Seção 1 */}
      <section className="w-full max-w-4xl mx-auto text-center px-6 pt-14 pb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD54F]/10 border border-[#FFD54F]/30 text-[#FFD54F] text-xs font-semibold tracking-wide uppercase mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Lote 1 | 10 oportunidades
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          Não entre apenas no aplicativo. Entre para a história dele.
        </h1>
        <p className="text-[#A0A0B2] text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
          O Parceiro Fundador participa do Dicas LGBT+ App desde o começo, com presença de destaque,
          benefícios exclusivos e participação mais próxima na construção da plataforma.
        </p>
        <p className="text-white font-bold text-lg mt-6">R$ 3.490 à vista no Pix ou 12x de R$ 349 no cartão.</p>
        <div className="mt-8">
          <BotaoWhatsapp />
        </div>
      </section>

      {/* Seção 2 — Benefícios */}
      <section className="w-full max-w-4xl mx-auto px-6 py-14 border-t border-[#232230]">
        <ul className="space-y-3">
          {BENEFICIOS.map((b) => (
            <li key={b} className="flex items-start gap-3 bg-[#161520] border border-[#232230] rounded-2xl p-5">
              <span className="w-2 h-2 rounded-full bg-[#FFD54F] mt-1.5 shrink-0" />
              <p className="text-sm text-[#D0D0E0] leading-relaxed">{b}</p>
            </li>
          ))}
        </ul>
        <div className="text-center mt-8">
          <BotaoWhatsapp />
        </div>
      </section>

      {/* Seção 3 — Vitrine de parceiros */}
      <section className="w-full max-w-6xl mx-auto px-6 py-14 border-t border-[#232230]">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-center">
          Quem já está construindo este futuro com a gente.
        </h2>
        <p className="text-[#626274] text-xs text-center">
          Vitrine dos Parceiros Fundadores confirmados — aparece aqui assim que o primeiro lote for
          fechado.
        </p>
      </section>

      {/* Seção 4 — FAQ */}
      <section className="w-full max-w-3xl mx-auto px-6 py-14 border-t border-[#232230]">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center">Perguntas frequentes</h2>
        <div className="space-y-4">
          {FAQ.map((f) => (
            <div key={f.p} className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
              <h3 className="font-bold mb-2">{f.p}</h3>
              <p className="text-[#A0A0B2] text-sm leading-relaxed">{f.r}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/#cadastro" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white transition">
            Ou prefere começar pelo cadastro gratuito? <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
      <MobileFixedCta variant="cadastro" />
    </main>
  );
}
