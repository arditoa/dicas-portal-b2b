'use client';

// Rodada 129 — central de ajuda do parceiro: passo a passo de cada tela,
// perguntas frequentes e contato com a equipe.
import { ChevronDown, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AJUDA_PAGINAS, FAQ } from '../../../lib/ajudaPaginas';
import { linkWhatsappEquipe } from '../../../lib/equipe';
import { useParceiro } from '../../../components/parceiro/ParceiroContext';
import { recursosDaLocal } from '../../../lib/parceiro';

export default function AjudaPage() {
  const p = useParceiro();
  const [aberta, setAberta] = useState<string | null>(null);
  const linkTime = linkWhatsappEquipe(`Olá! Preciso de ajuda no portal do parceiro${p ? ` (${p.local.nome})` : ''}.`);

  // Só mostra as telas que existem para a categoria deste parceiro.
  const telas = Object.entries(AJUDA_PAGINAS).filter(([caminho]) => {
    if (!p) return true;
    const c = p.local.categoria;
    const r = recursosDaLocal(p.local);
    if (caminho === '/dashboard/agenda') return r.agenda;
    if (caminho === '/dashboard/eventos') return r.eventos;
    if (caminho === '/dashboard/lista-vip') return r.listaVip;
    if (caminho === '/dashboard/cupons') return !!r.cupom;
    if (caminho === '/dashboard/checkins') return r.checkins;
    if (caminho === '/dashboard/fidelidade') return r.fidelidade;
    if (caminho === '/dashboard/produtos') return c === 'produtos';
    if (caminho === '/dashboard/hospedagem') return c === 'turismo';
    if (caminho === '/dashboard/pacotes') return (p.podePacotes ?? c === 'turismo');
    return true;
  });

  return (
    <div className="max-w-3xl space-y-10 p-5 md:p-8">
      <div>
        <h1 className="text-2xl font-black">Ajuda</h1>
        <p className="mt-1 text-sm text-[#A0A0B2]">Passo a passo de cada tela, respostas rápidas e como falar com a gente.</p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold">Como usar cada tela</h2>
        <div className="space-y-2">
          {telas.map(([caminho, a]) => (
            <div key={caminho} className="overflow-hidden rounded-2xl border border-[#232230] bg-[#161520]">
              <button
                onClick={() => setAberta(aberta === caminho ? null : caminho)}
                aria-expanded={aberta === caminho}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="flex-1 text-sm font-bold">{a.titulo}</span>
                <ChevronDown size={16} className={`text-[#A0A0B2] transition-transform ${aberta === caminho ? 'rotate-180' : ''}`} />
              </button>
              {aberta === caminho && (
                <div className="space-y-3 border-t border-[#232230] px-4 py-4 text-sm text-[#C8C8D8]">
                  <p>{a.paraQue}</p>
                  <ol className="list-decimal space-y-1 pl-5">{a.passos.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  {a.dica && <p className="rounded-xl bg-white/5 p-3 text-xs">{a.dica}</p>}
                  <Link href={caminho} className="inline-block text-xs font-bold text-[#FF7AA8] hover:underline">Ir para {a.titulo} →</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold">Perguntas frequentes</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <div key={f.p} className="overflow-hidden rounded-2xl border border-[#232230] bg-[#161520]">
              <button
                onClick={() => setAberta(aberta === f.p ? null : f.p)}
                aria-expanded={aberta === f.p}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="flex-1 text-sm font-bold">{f.p}</span>
                <ChevronDown size={16} className={`text-[#A0A0B2] transition-transform ${aberta === f.p ? 'rotate-180' : ''}`} />
              </button>
              {aberta === f.p && <p className="border-t border-[#232230] px-4 py-4 text-sm leading-relaxed text-[#C8C8D8]">{f.r}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#232230] bg-[#161520] p-5">
        <h2 className="mb-1 text-base font-bold">Ainda com dúvida?</h2>
        <p className="mb-4 text-sm text-[#A0A0B2]">Fale com o time do Dicas LGBT+. Respondemos pelo WhatsApp.</p>
        {linkTime ? (
          <a href={linkTime} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110">
            <MessageCircle size={16} /> Falar com o time
          </a>
        ) : (
          <p className="text-sm font-semibold text-white">Chame o time pelo mesmo WhatsApp que enviou o seu acesso.</p>
        )}
      </section>
    </div>
  );
}
