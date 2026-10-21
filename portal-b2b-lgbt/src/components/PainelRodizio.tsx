'use client';
// Rodada 77: o topo da Home agora é um bloco FIXO (fundadores + patrocinados) e o rodízio
// fica no bloco "Em alta agora", logo abaixo.
// Rodada 75 — aba "Rodízio" do /admin: mostra e ajusta o rodízio por horário
// da Home (carrossel do topo e "Em Alta"). A conta é a mesma do app
// (src/lib/rodizio.ts); aqui você vê quem aparece agora e nas próximas horas
// e define quantos locais por vez e de quanto em quanto tempo.
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  FUNDADORES_MAX_PADRAO,
  RODIZIO_INTERVALO_PADRAO_MIN,
  RODIZIO_TAMANHO_PADRAO,
  aparicoesPorDia,
  blocoFixoDiario,
  chaveSemana,
  VITRINE_HOME_MAX,
  deveMostrarRodizio,
  elegivelVitrineHome,
  inicioDoSlot,
  rodizioComPrioridade,
  slotAtual,
} from '../lib/rodizio';

type L = {
  id: string;
  nome: string;
  categoria: string | null;
  foto_capa_url: string | null;
  galeria_fotos: string[] | null;
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
  const [fundMax, setFundMax] = useState(FUNDADORES_MAX_PADRAO);
  const [idsFundadores, setIdsFundadores] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [l, c, fb] = await Promise.all([
      supabase
        .from('locais')
        .select('id, nome, categoria, foto_capa_url, galeria_fotos, plano_comercial, plano_comercial_status, destaque_secoes, destaque_ate')
        .eq('status', 'aprovado')
        .limit(500),
      supabase.from('app_config').select('chave, valor').in('chave', ['rodizio_tamanho', 'rodizio_intervalo_min', 'fundadores_max_topo']),
      supabase
        .from('local_badges')
        .select('locais!inner(id, status)')
        .ilike('rotulo', '%fundador%')
        .eq('ativo', true)
        .eq('locais.status', 'aprovado')
        .limit(100),
    ]);
    setIdsFundadores(
      (((fb.data as unknown) as { locais: { id: string } | { id: string }[] | null }[]) ?? [])
        .map((r) => (Array.isArray(r.locais) ? r.locais[0]?.id : r.locais?.id))
        .filter((x): x is string => !!x)
    );
    setLocais((l.data as L[]) ?? []);
    const mapa: Record<string, string | null> = {};
    (c.data ?? []).forEach((r: { chave: string; valor: string | null }) => { mapa[r.chave] = r.valor; });
    const t = parseInt(mapa['rodizio_tamanho'] ?? '', 10);
    const i = parseInt(mapa['rodizio_intervalo_min'] ?? '', 10);
    if (Number.isFinite(t)) setTamanho(Math.min(12, Math.max(1, t)));
    if (Number.isFinite(i)) setIntervalo(Math.min(240, Math.max(15, i)));
    const f = parseInt(mapa['fundadores_max_topo'] ?? '', 10);
    if (Number.isFinite(f)) setFundMax(Math.min(20, Math.max(1, f)));
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // Bloco fixo do topo (igual ao app): fundadores com selo + patrocinados fixados.
  const { fixos, prioritarios, demais } = useMemo(() => {
    const idsF = new Set(idsFundadores);
    const noPrazo = (l: L) => !l.destaque_ate || new Date(l.destaque_ate).getTime() >= Date.now();
    const fixosL = locais.filter((l) => idsF.has(l.id) || (!!l.destaque_secoes?.includes('patrocinado') && noPrazo(l)));
    const idsFix = new Set(fixosL.map((l) => l.id));
    // Mesma regra do app: só lugares de experiência e com foto entram em "Em alta agora".
    const pool = locais.filter((l) => !idsFix.has(l.id) && elegivelVitrineHome(l));
    const p = pool.filter(prioritario);
    const ids = new Set(p.map((x) => x.id));
    return { fixos: fixosL, prioritarios: p, demais: pool.filter((x) => !ids.has(x.id)) };
  }, [locais, idsFundadores]);

  const fundadoresL = useMemo(() => fixos.filter((l) => idsFundadores.includes(l.id)), [fixos, idsFundadores]);
  const topoHoje = useMemo(() => blocoFixoDiario(fundadoresL, fundMax), [fundadoresL, fundMax]);
  const poolTam = prioritarios.length + demais.length;
  const qtdHome = Math.min(tamanho, VITRINE_HOME_MAX);
  const mostraBloco = deveMostrarRodizio(poolTam, qtdHome);

  const agora = slotAtual(Date.now(), intervalo);
  const semana = chaveSemana();
  const linhas = useMemo(() => {
    return Array.from({ length: 12 }, (_, k) => {
      const slot = agora + k;
      return { slot, inicio: inicioDoSlot(slot, intervalo), itens: rodizioComPrioridade(prioritarios, demais, slot, qtdHome, semana) };
    });
  }, [agora, intervalo, qtdHome, prioritarios, demais, semana]);

  const porDia = aparicoesPorDia(Math.max(demais.length, 0), Math.max(qtdHome - prioritarios.length, 0), intervalo);

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const agoraIso = new Date().toISOString();
    const { error } = await supabase.from('app_config').upsert(
      [
        { chave: 'rodizio_tamanho', valor: String(tamanho), atualizado_em: agoraIso },
        { chave: 'rodizio_intervalo_min', valor: String(intervalo), atualizado_em: agoraIso },
        { chave: 'fundadores_max_topo', valor: String(fundMax), atualizado_em: agoraIso },
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
        <h3 className="font-bold text-sm">Regras da Home</h3>
        <label className="text-xs text-[#A0A0B2] flex flex-col gap-1.5">
          Vagas do bloco fixo de Fundadores (1 a 20)
          <input type="number" min={1} max={20} className={campo} value={fundMax} onChange={(e) => setFundMax(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
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
          <p className="mt-1">O bloco "Em alta agora" da Home mostra até {VITRINE_HOME_MAX} locais, só bares, festas/eventos, gastronomia, cultura e turismo, e só com foto. Serviços e lojas ficam nas suas categorias. A página Em Alta usa todos os locais. A ordem do ciclo muda uma vez por semana. {mostraBloco ? 'O bloco aparece na Home.' : `O bloco fica escondido enquanto houver menos de ${Math.max(2, qtdHome)} locais elegíveis (hoje: ${poolTam}).`}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
        <h3 className="font-bold text-sm mb-1">Topo fixo da Home (hoje)</h3>
        <p className="text-[11px] text-[#626274] mb-3">
          Fundadores sempre aparecem; a ordem muda uma vez por dia. {fundadoresL.length > fundMax ? `Há ${fundadoresL.length} fundadores e só ${fundMax} vagas: o grupo avança a cada dia.` : `${fundadoresL.length} fundador(es) de ${fundMax} vaga(s).`}
        </p>
        <p className="text-xs text-[#A0A0B2]">
          {topoHoje.length === 0 && 'Nenhum fundador com selo ativo. O topo some e o bloco "Em alta agora" aparece primeiro.'}
          {topoHoje.map((x, i) => <span key={x.id}>{i > 0 ? ' · ' : ''}<b className="text-white">{x.nome}</b></span>)}
          {fixos.filter((l) => !idsFundadores.includes(l.id)).map((x) => <span key={x.id}> · {x.nome} (patrocinado)</span>)}
        </p>
      </div>

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
        <h3 className="font-bold text-sm mb-1">Em alta agora: bloco que gira por horário</h3>
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
    </div>
  );
}
