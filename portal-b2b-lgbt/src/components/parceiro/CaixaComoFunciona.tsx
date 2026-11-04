'use client';

// Rodada 129 — caixa "Como funciona esta tela" no topo de cada página do
// painel. Aberta na primeira visita; o parceiro pode recolher e o aparelho
// lembra. O conteúdo vem de lib/ajudaPaginas.ts.
import { ChevronDown, CircleHelp, Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AJUDA_PAGINAS } from '../../lib/ajudaPaginas';

const chave = (caminho: string) => `ajuda_recolhida:${caminho}`;

export default function CaixaComoFunciona({ caminho }: { caminho: string }) {
  const ajuda = AJUDA_PAGINAS[caminho];
  const [aberta, setAberta] = useState(true);

  useEffect(() => {
    try {
      setAberta(window.localStorage.getItem(chave(caminho)) !== '1');
    } catch {
      setAberta(true);
    }
  }, [caminho]);

  if (!ajuda) return null;

  const alternar = () => {
    const novo = !aberta;
    setAberta(novo);
    try {
      window.localStorage.setItem(chave(caminho), novo ? '0' : '1');
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
  };

  return (
    <section className="mx-5 mt-5 rounded-2xl border border-[#A855F7]/25 bg-gradient-to-br from-[#A855F7]/10 to-[#E1306C]/5 md:mx-8">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberta}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <CircleHelp size={16} className="shrink-0 text-[#C084FC]" />
        <span className="flex-1 text-sm font-bold text-white">Como funciona: {ajuda.titulo}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#A0A0B2] transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>
      {aberta && (
        <div className="space-y-3 px-4 pb-4 text-sm text-[#C8C8D8]">
          <p className="leading-relaxed">{ajuda.paraQue}</p>
          <ol className="space-y-1.5">
            {ajuda.passos.map((p, i) => (
              <li key={i} className="flex gap-2.5 leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A855F7]/25 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
          {ajuda.dica && (
            <p className="flex gap-2 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-[#D8D8E8]">
              <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <span>{ajuda.dica}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
