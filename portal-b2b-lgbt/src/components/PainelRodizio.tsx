'use client';
// Rodada 75 — aba "Rodízio" do /admin: mostra e ajusta o rodízio por horário
// da Home (carrossel do topo e "Em Alta"). A conta é a mesma do app
// (src/lib/rodizio.ts); aqui você vê quem aparece agora e nas próximas horas
// e define quantos locais por vez e de quanto em quanto tempo.
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  RODIZIO_INTERVALO_PADRAO_MIN,
  RODIZIO_TAMANHO_PADRAO,
  aparicoesPorDia,
  chaveSemana,
  inicioDoSlot,
  rodizioComPrioridade,
  slotAtual,
} from '../lib/rodizio';

type L = {
  id: string;
  nome: string;
  plano_comercial: string | null;
  plano_comercial_status: string | null;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
};

const PAGA = new Set(['premium', 'fundador']);

function prioritario(l: L): boolean {
  const paga = !!l.plano_comercial && PAGA.has(l.plano_comercial) && (l.plano_comercial_status ?? 'ativo') === 'ativo';
  const noPrazo = !l.destaque_ate || new Date(l.destaque_ate).getTime() >= Date.now();
  const fixado = !!l.destaque_secoes?.includes('em_alta') && noPrazo;
  return paga || fixado;
}

export default function PainelRodizio() {
  const [locais, setLocais] = useState<L[]>([]);
  const [tamanho, setTamanho] = useState(RODIZIO_TAMANHO_PADRAO);
  const [intervalo, setIntervalo] = useState(RODIZIO_INTERVALO_PADRAO_MIN);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [l, c] = await Promise.all([
      supabase
        .from('locais')
        .select('id, nome, plano_comercial, plano_comercial_status, destaque_secoes, destaque_ate')
        .eq('status', 'aprovado')
        .limit(500),
      supabase.from('app_config').select('chave, valor').in('chave', ['rodizio_tamanho', 'rodizio_intervalo_min']),
    ]);
    setLocais((l.data as L[]) ?? []);
    const mapa: Record<string, string | null> = {};
    (c.data ?? []).forEach((r: { chave: string; valor: string | null }) => { mapa[r.chave] = r.valor; });
    const t = parseInt(mapa['rodizio_tamanho'] ?? '', 10);
    const i = parseInt(mapa['rodizio_intervalo_min'] ?? '', 10);
    if (Number.isFinite(t)) setTamanho(Math.min(12, Math.max(1, t)));
    if (Number.isFinite(i)) setIntervalo(Math.min(240, Math.max(15, i)));
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const { prioritarios, demais } = useMemo(() => {
    const p = locais.filter(prioritario);
    const ids = new Set(p.map((x) => x.id));
    return { prioritarios: p, demais: locais.filter((x) => !ids.has(x.id)) };
  }, [locais]);

  const agora = slotAtual(Date.now(), intervalo);
  const semana = chaveSemana();
  const linhas = useMemo(() => {
    return Array.from({ length: 12 }, (_, k) => {
      const slot = agora + k;
      return { slot, inicio: inicioDoSlot(slot, intervalo), itens: rodizioComPrioridade(prioritarios, demais, slot, tamanho, semana) };
    });
  }, [agora, intervalo, tamanho, prioritarios, demais, semana]);

  const porDia = aparicoesPorDia(Math.max(demais.length, 0), Math.max(tamanho - prioritarios.length, 0), intervalo);

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const agoraIso = new Date().toISOString();
    const { error } = await supabase.from('app_config').upsert(
      [
        { chave: 'rodizio_tamanho', valor: String(tamanho), atualizado_em: agoraIso },
        { chave: 'rodizio_intervalo_min', valor: String(intervalo), atualizado_em: agoraIso },
      ],
      { onConflict: 'chave' }
    );
    setSalvando(false);
    setMsg(error ? { ok: false, texto: error.message } : { ok: true, texto: 'Salvo. O app aplica na próxima abertura ou atualização da Home.' });
  }

  const campo = 'bg-[#12121A] border border-[#232230] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E1306C]';

  if (carregando) return <Loader2 className="w-5 h-5 animate-spin text-[#A0A0B2]" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 flex flex-col gap-4 h-fit">
        <h3 className="font-bold text-sm">Regras do rodízio</h3>
        <label className="text-xs text-[#A0A0B2] flex flex-col gap-1.5">
          Locais por vez (1 a 12)
          <input type="number" min={1} max={12} className={campo} value={tamanho} onChange={(e) => setTamanho(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <label className="text-xs text-[#A0A0B2] flex flex-col gap-1.5">
          Trocar a cada
          <select className={campo} value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
            {[15, 30, 60, 120, 240].map((m) => <option key={m} value={m}>{m < 60 ? `${m} minutos` : `${m / 60} hora${m > 60 ? 's' : ''}`}</option>)}
          </select>
        </label>
        <button type="button" onClick={salvar} disabled={salvando} className="bg-[#E1306C] hover:opacity-90 disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-xl">
          {salvando ? 'Salvando…' : 'Salvar regras'}
        </button>
        {msg && <p role="alert" className={`text-xs ${msg.ok ? 'text-[#4CAF7D]' : 'text-red-400'}`}>{msg.texto}</p>}
        <div className="text-[11px] text-[#A0A0B2] leading-relaxed border-t border-[#232230] pt-3">
          <p><b className="text-white">{prioritarios.length}</b> local(is) com prioridade (plano Premium/Fundador ativo ou fixado em Em Alta) e <b className="text-white">{demais.length}</b> para completar as vagas.</p>
          {prioritarios.length >= tamanho
            ? <p className="mt-1">Há prioritários suficientes: só eles rodam.</p>
            : <p className="mt-1">Os prioritários aparecem sempre; as outras {tamanho - prioritarios.length} vaga(s) rodam entre os demais (cada um aparece cerca de {porDia.toFixed(1)}x por dia).</p>}
          <p className="mt-1">Para cada local aparecer 2x por dia seriam necessários {Math.round((24 * 60 / intervalo) * tamanho / 2)} locais no rodízio.</p>
          <p className="mt-1">Vale para o carrossel do topo (fundadores e patrocinados primeiro) e para Em Alta. A ordem do ciclo muda uma vez por semana.</p>
        </div>
      </div>

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
        <h3 className="font-bold text-sm mb-1">Em Alta: agora e nas próximas horas</h3>
        <p className="text-[11px] text-[#626274] mb-4">Prévia pela regra acima, no horário de Brasília. Negrito = prioridade.</p>
        <ul className="flex flex-col gap-3">
          {linhas.map((ln, k) => (
            <li key={ln.slot} className={`text-xs rounded-xl p-3 border ${k === 0 ? 'border-[#E1306C] bg-[#E1306C]/10' : 'border-[#232230]'}`}>
              <p className="font-bold mb-1">
                {k === 0 ? 'Agora · ' : ''}
                {ln.inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
              </p>
              <p className="text-[#A0A0B2]">
                {ln.itens.length === 0 && 'Nenhum local aprovado.'}
                {ln.itens.map((x, i) => (
                  <span key={x.id}>
                    {i > 0 ? ' · ' : ''}
                    {prioritario(x) ? <b className="text-white">{x.nome}</b> : x.nome}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
