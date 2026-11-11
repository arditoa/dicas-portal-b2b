'use client';
// Rodada 138 — "festa do plano": marca Fundador ou Premium destaca até 4 festas por mês na faixa
// "Festas em destaque" do app (só o flier), todos os dias até o fim da festa, na tela inicial de Festas e na
// tela do tipo da festa. A festa avulsa de R$ 89 aparece só 1 dia antes e no dia.
// Usado no portal do parceiro (Minhas festas) e no /admin. Grava pela função destacar_festa_do_plano
// (migration 093), que confere dono, plano e limite.
import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const LIMITE_FESTAS_PLANO = 4;

type Props = {
  evento: { id: string; local_id: string | null; data_inicio: string; data_fim: string | null; status: string; destaque_secoes?: string[] | null };
  modo: 'parceiro' | 'admin';
  onMudou?: (ligado: boolean) => void;
};

export default function DestaqueFestaPlano({ evento, modo, onMudou }: Props) {
  const [temPlano, setTemPlano] = useState<boolean | null>(null);
  const [usadas, setUsadas] = useState(0);
  const [ligado, setLigado] = useState((evento.destaque_secoes || []).includes('plano_festa'));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const mes = new Date(evento.data_inicio).toLocaleDateString('pt-BR', { month: 'long' });
  const encerrada = new Date(evento.data_fim || evento.data_inicio).getTime() < Date.now();

  const carregar = useCallback(async () => {
    if (!evento.local_id) { setTemPlano(false); return; }
    const [{ data: tem }, { data: n }] = await Promise.all([
      supabase.rpc('marca_tem_festa_do_plano', { p_local: evento.local_id }),
      supabase.rpc('festas_do_plano_no_mes', { p_local: evento.local_id, p_data: evento.data_inicio }),
    ]);
    setTemPlano(!!tem);
    setUsadas(Number(n) || 0);
  }, [evento.local_id, evento.data_inicio]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setLigado((evento.destaque_secoes || []).includes('plano_festa')); }, [evento.destaque_secoes]);

  const alternar = async () => {
    setSalvando(true); setErro('');
    const { data, error } = await supabase.rpc('destacar_festa_do_plano', { p_evento: evento.id, p_ligar: !ligado });
    setSalvando(false);
    if (error) {
      setErro(/does not exist|function/i.test(error.message) ? 'Falta rodar a migration 093 no Supabase.' : error.message);
      return;
    }
    const novo = !ligado;
    setLigado(novo);
    setUsadas(Number((data as any)?.usadas) || 0);
    onMudou?.(novo);
  };

  if (temPlano === null) return <p className="text-[11px] text-[#626274] flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Conferindo o plano...</p>;

  if (!temPlano) {
    if (modo === 'admin') return <p className="text-[11px] text-[#626274]">Destaque do plano: só para marcas Fundador ou Premium. Esta festa pode usar a divulgação paga de R$ 89.</p>;
    return (
      <div className="bg-[#0B0B0E] border border-[#232230] rounded-xl p-3 text-xs text-[#A0A0B2]">
        Quer sua festa em <b className="text-white">Festas em destaque</b>? Divulgação avulsa por R$ 89 (aparece 1 dia antes e no dia),
        ou com o plano <b className="text-white">Fundador ou Premium</b>: 4 festas por mês, todos os dias até a festa.{' '}
        <Link href="/planos" className="text-[#E1306C] font-bold">Ver planos</Link>
      </div>
    );
  }

  const restantes = Math.max(0, LIMITE_FESTAS_PLANO - usadas);
  return (
    <div className={`rounded-xl p-3 border ${ligado ? 'bg-[#E1306C]/10 border-[#E1306C]/50' : 'bg-[#0B0B0E] border-[#232230]'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <Sparkles size={14} className="text-[#E1306C] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">{ligado ? 'Em destaque pelo plano' : 'Destacar com o plano'}</p>
          <p className="text-[11px] text-[#A0A0B2]">
            Só o flier, em &ldquo;Festas em destaque&rdquo; (tela de Festas e tela do tipo da festa), todos os dias até a festa.
            {' '}Usadas em {mes}: <b className="text-white">{usadas} de {LIMITE_FESTAS_PLANO}</b>.
          </p>
        </div>
        <button
          type="button"
          onClick={alternar}
          disabled={salvando || (!ligado && (encerrada || evento.status !== 'aprovado' || (restantes === 0 && modo !== 'admin')))}
          className={`text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40 ${ligado ? 'bg-[#232230] text-[#D0D0E0]' : 'bg-[#E1306C] text-white'}`}
        >
          {salvando ? 'Salvando...' : ligado ? 'Tirar do destaque' : 'Destacar'}
        </button>
      </div>
      {!ligado && evento.status !== 'aprovado' && <p className="text-[11px] text-amber-300 mt-1.5">Libera quando a festa for aprovada.</p>}
      {!ligado && encerrada && <p className="text-[11px] text-amber-300 mt-1.5">Esta festa já aconteceu.</p>}
      {!ligado && restantes === 0 && <p className="text-[11px] text-amber-300 mt-1.5">{modo === 'admin' ? `A marca já usou as ${LIMITE_FESTAS_PLANO} deste mês (a equipe pode passar do limite).` : `Você já usou as ${LIMITE_FESTAS_PLANO} festas de ${mes}. Para mais, use a divulgação de R$ 89.`}</p>}
      {erro && <p className="text-[11px] text-red-400 mt-1.5">{erro}</p>}
    </div>
  );
}

