import { Gift } from 'lucide-react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import WaitlistForm from '../../components/WaitlistForm';

export const dynamic = 'force-dynamic';

// Rodada 58 — Guia, Seção 7 "Página Lista de lançamento" (URL /lancamento).
// Textos exatos do documento. Reaproveita o WaitlistForm compartilhado
// (mesmo mecanismo de leads_institucionais).

export default function LancamentoPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <Header />

      <section className="w-full max-w-2xl mx-auto text-center px-6 pt-14 pb-20">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#E1306C]/10 border border-[#E1306C]/20 items-center justify-center mb-6">
          <Gift className="w-7 h-7 text-[#E1306C]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
          Você vai querer estar aqui desde o começo.
        </h1>
        <p className="text-[#A0A0B2] text-base max-w-xl mx-auto mt-5 leading-relaxed">
          Entre na lista de lançamento do Dicas LGBT+ App e receba as novidades em primeira mão.
        </p>
        <p className="text-[#A0A0B2] text-sm max-w-xl mx-auto mt-3 leading-relaxed">
          Quem estiver na lista será avisado sobre cupons, brindes e listas VIP preparados para o
          lançamento.
        </p>

        <div className="mt-10">
          <WaitlistForm
            origemLabel="Lista de lançamento (/lancamento)"
            textoBotao="Quero entrar na lista de lançamento"
            textoSucesso="Pronto! Você entrou na lista. Vamos avisar por e-mail e WhatsApp quando o Dicas LGBT+ App estiver pronto para você."
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
