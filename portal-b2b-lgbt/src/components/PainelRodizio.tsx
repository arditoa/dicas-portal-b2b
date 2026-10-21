'use client';
// Rodada 81 — aba "Rodízio" do /admin: regras da Home, prévia do que aparece (topo fixo, faixa
// premium e "Em Alta na Home agora", com o motivo de cada local) e curadoria de Em Alta com
// prazo. A conta é a mesma do app (src/lib/rodizio.ts e src/lib/destaque.ts).
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  compararDestaque,
  ehPremiumAtivo,
  deveExibirGlow,
  emAltaDaHora,
  estaFixadoEm,
  pagaPlanoComDireitoADestaque,
} from '../lib/destaque';
import {
  FAIXA_PREMIUM_MAX,
  FAIXA_PREMIUM_MIN,
  FUNDADORES_MAX_PADRAO,
  RODIZIO_INTERVALO_PADRAO_MIN,
  RODIZIO_TAMANHO_PADRAO,
  blocoFixoDiario,
  chaveSemana,
  grupoFaixaPremium,
  inicioDoSlot,
  slotAtual,
  temImagemParaFaixa,
} from '../lib/rodizio';

type L = {
  id: string;
  nome: string;
  categoria: string | null;
  logo_url: string | null;
  foto_capa_url: string | null;
  galeria_fotos: string[] | null;
  plano_destaque: string;
  plano_comercial: string | null;
  plano_comercial_status: string | null;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
};

type Motivo = 'destaque' | 'fixado' | 'pago' | 'rotacao';
type Cartao = { l: L; motivo: Motivo };

const ROTULO_MOTIVO: Record<Motivo, string> = {
  destaque: 'Destaque',
  fixado: 'Fixado por você',
  pago: 'Plano pago',
  rotacao: 'Completando a rotação',
};
const COR_MOTIVO: Record<Motivo, string> = {
  destaque: 'bg-[#FFD54F] text-black',
  fixado: 'bg-[#E1306C]/20 text-[#FF9DB8]',
  pago: 'bg-[#4CAF7D]/20 text-[#4CAF7D]',
  rotacao: 'bg-[#232230] text-[#A0A0B2]',
};
const ROTULO_CATEGORIA: Record<string, string> = {
  lugares: 'Bares e noite',
  gastronomia: 'Gastronomia',
  cultura: 'Cultura',
  eventos: 'Eventos',
  turismo: 'Turismo',
  servicos: 'Serviços',
};
const ROTULO_SECAO: Record<string, string> = {
  hoje: 'Hoje',
  destaque: 'Destaque da semana',
  patrocinado: 'Patrocinado',
  turismo: 'Dicas Trip',
  selo_dicas: 'Selo Dicas',
};
const NOME_CNPJ = /^\s*\d{2}\.?\d{3}\.?\d{3}/;

const temFoto = (l: L) => !!(l.foto_capa_url || l.galeria_fotos?.[0]);
const imagemDe = (l: L) => l.foto_capa_url || l.galeria_fotos?.[0] || l.logo_url || null;

function problemasDe(l: L): string[] {
  const p: string[] = [];
  if (!temFoto(l)) p.push(l.logo_url ? 'só logo, sem foto' : 'sem foto');
  if (NOME_CNPJ.test(l.nome)) p.push('nome com CNPJ');
  return p;
}

function motivoDe(l: L, deDestaque: boolean): Motivo {
  if (deDestaque) return 'destaque';
  if (estaFixadoEm(l, 'em_alta')) return 'fixado';
  if (pagaPlanoComDireitoADestaque(l)) return 'pago';
  return 'rotacao';
}

const fmtHora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export default function PainelRodizio() {
  const [locais, setLocais] = useState<L[]>([]);
  const [tamanho, setTamanho] = useState(RODIZIO_TAMANHO_PADRAO);
  const [intervalo, setIntervalo] = useState(RODIZIO_INTERVALO_PADRAO_MIN);
  const [fundMax, setFundMax] = useState(FUNDADORES_MAX_PADRAO);
  const [completar, setCompletar] = useState(true);
  const [idsFundadores, setIdsFundadores] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  // Curadoria
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'fixados' | 'pagos' | 'problemas'>('todos');
  const [prazoDias, setPrazoDias] = useState(15);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msgCur, setMsgCur] = useState<{ ok: boolean; texto: string } | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [l, c, fb] = await Promise.all([
      supabase
        .from('locais')
        .select('id, nome, categoria, logo_url, foto_capa_url, galeria_fotos, plano_destaque, plano_comercial, plano_comercial_status, destaque_secoes, destaque_ate')
        .eq('status', 'aprovado')
        .limit(500),
      supabase.from('app_config').select('chave, valor').in('chave', ['rodizio_tamanho', 'rodizio_intervalo_min', 'fundadores_max_topo', 'em_alta_completar']),
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
    setCompletar(mapa['em_alta_completar'] !== '0');
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // Topo fixo (igual ao app): fundadores com selo + patrocinados fixados.
  // Faixa premium (abaixo dos ícones): plano pago ativo ou fixado em Em Alta, com logo/foto, fora do topo.
  const { fixos, premium } = useMemo(() => {
    const idsF = new Set(idsFundadores);
    const noPrazo = (l: L) => !l.destaque_ate || new Date(l.destaque_ate).getTime() >= Date.now();
    const fixosL = locais.filter((l) => idsF.has(l.id) || (!!l.destaque_secoes?.includes('patrocinado') && noPrazo(l)));
    const idsFix = new Set(fixosL.map((l) => l.id));
    return { fixos: fixosL, premium: locais.filter((l) => !idsFix.has(l.id) && ehPremiumAtivo(l) && temImagemParaFaixa(l)) };
  }, [locais, idsFundadores]);

  const fundadoresL = useMemo(() => fixos.filter((l) => idsFundadores.includes(l.id)), [fixos, idsFundadores]);
  const topoHoje = useMemo(() => blocoFixoDiario(fundadoresL, fundMax), [fundadoresL, fundMax]);
  const mostraFaixa = premium.length >= FAIXA_PREMIUM_MIN;

  const agora = slotAtual(Date.now(), intervalo);
  const semana = chaveSemana();
  const linhas = useMemo(() => {
    return Array.from({ length: 12 }, (_, k) => {
      const slot = agora + k;
      return { slot, inicio: inicioDoSlot(slot, intervalo), itens: grupoFaixaPremium(premium, slot, semana) };
    });
  }, [agora, intervalo, premium, semana]);

  // "Em Alta na Home agora": mesma montagem da Home (destaques primeiro, depois a rotação da hora;
  // quem já está no topo fixo não se repete; quem tem foto vem antes; no máximo 8 cartões).
  const linhasEmAlta = useMemo(() => {
    const destaqueTodos = locais.filter((l) => deveExibirGlow(l)).sort(compararDestaque<L>('destaque'));
    const idsDestaque = new Set(destaqueTodos.map((l) => l.id));
    const poolSem = locais.filter((l) => !idsDestaque.has(l.id));
    const pool = poolSem.length > 0 ? poolSem : locais;
    const idsFixos = new Set(fixos.map((l) => l.id));
    return Array.from({ length: 6 }, (_, k) => {
      const slot = agora + k;
      const rotacao = emAltaDaHora(pool, slot, tamanho, completar);
      const vistos = new Set<string>();
      const ordem: Cartao[] = [
        ...destaqueTodos.slice(0, 8).map((l) => ({ l, motivo: 'destaque' as Motivo })),
        ...rotacao.map((l) => ({ l, motivo: motivoDe(l, false) })),
      ].filter((c) => {
        if (idsFixos.has(c.l.id) || vistos.has(c.l.id)) return false;
        vistos.add(c.l.id);
        return true;
      });
      const cartoes = [...ordem.filter((c) => temFoto(c.l)), ...ordem.filter((c) => !temFoto(c.l))].slice(0, 8);
      return { slot, inicio: inicioDoSlot(slot, intervalo), cartoes };
    });
  }, [locais, fixos, agora, intervalo, tamanho, completar]);

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const agoraIso = new Date().toISOString();
    const { error } = await supabase.from('app_config').upsert(
      [
        { chave: 'rodizio_tamanho', valor: String(tamanho), atualizado_em: agoraIso },
        { chave: 'rodizio_intervalo_min', valor: String(intervalo), atualizado_em: agoraIso },
        { chave: 'fundadores_max_topo', valor: String(fundMax), atualizado_em: agoraIso },
        { chave: 'em_alta_completar', valor: completar ? '1' : '0', atualizado_em: agoraIso },
      ],
      { onConflict: 'chave' }
    );
    setSalvando(false);
    setMsg(error ? { ok: false, texto: error.message } : { ok: true, texto: 'Salvo. O app aplica na próxima abertura ou atualização da Home.' });
  }

  // Curadoria: fixar / tirar de Em Alta (grava em locais.destaque_secoes e destaque_ate).
  async function alternarFixacao(l: L, fixar: boolean) {
    setOcupado(l.id);
    setMsgCur(null);
    const atuais = l.destaque_secoes ?? [];
    const novas = fixar ? Array.from(new Set([...atuais, 'em_alta'])) : atuais.filter((s) => s !== 'em_alta');
    const outras = novas.filter((s) => s !== 'em_alta');
    let ate: string | null = l.destaque_ate;
    let aviso = '';
    if (!fixar) {
      ate = novas.length > 0 ? l.destaque_ate : null;
    } else if (prazoDias > 0) {
      if (outras.length > 0 && !l.destaque_ate) {
        ate = null;
        aviso = ' O local já tem outras marcações sem prazo, então a fixação ficou sem prazo para não apagá-las.';
      } else {
        const novo = Date.now() + prazoDias * 86400000;
        const atual = l.destaque_ate ? new Date(l.destaque_ate).getTime() : 0;
        ate = new Date(Math.max(novo, atual)).toISOString();
      }
    } else {
      ate = outras.length > 0 ? l.destaque_ate : null;
    }
    const { error } = await supabase.from('locais').update({ destaque_secoes: novas, destaque_ate: ate }).eq('id', l.id);
    setOcupado(null);
    if (error) {
      setMsgCur({ ok: false, texto: error.message });
      return;
    }
    setLocais((atual) => atual.map((x) => (x.id === l.id ? { ...x, destaque_secoes: novas, destaque_ate: ate } : x)));
    setMsgCur({
      ok: true,
      texto: `${l.nome}: ${fixar ? 'fixado em Em Alta' + (ate ? ` até ${fmtData(ate)}` : ' sem prazo') : 'tirado de Em Alta'}.${aviso}`,
    });
  }

  const listaCuradoria = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return locais
      .filter((l) => {
        if (termo && !l.nome.toLowerCase().includes(termo)) return false;
        if (filtro === 'fixados') return estaFixadoEm(l, 'em_alta');
        if (filtro === 'pagos') return pagaPlanoComDireitoADestaque(l);
        if (filtro === 'problemas') return problemasDe(l).length > 0;
        return true;
      })
      .sort((a, b) => {
        const pa = Number(ehPremiumAtivo(a));
        const pb = Number(ehPremiumAtivo(b));
        return pb - pa || a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [locais, busca, filtro]);
  const listaVisivel = mostrarTodos ? listaCuradoria : listaCuradoria.slice(0, 40);

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
          Locais por vez em Em Alta (1 a 12)
          <input type="number" min={1} max={12} className={campo} value={tamanho} onChange={(e) => setTamanho(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <label className="text-xs text-[#A0A0B2] flex flex-col gap-1.5">
          Trocar a cada
          <select className={campo} value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
            {[15, 30, 60, 120, 240].map((m) => <option key={m} value={m}>{m < 60 ? `${m} minutos` : `${m / 60} hora${m > 60 ? 's' : ''}`}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#D0D0E0] flex items-start gap-2 cursor-pointer border-t border-[#232230] pt-3">
          <input type="checkbox" className="accent-[#E1306C] mt-0.5" checked={completar} onChange={(e) => setCompletar(e.target.checked)} />
          <span>
            <b className="text-white">Completar vagas de Em Alta com locais não pagos</b>
            <span className="block text-[#A0A0B2] mt-1 leading-relaxed">
              Ligado: quem paga ou foi fixado vem primeiro e as vagas que sobram são preenchidas com locais que tenham foto e nome fantasia (nunca razão social/CNPJ). Desligado: Em Alta mostra só quem paga ou foi fixado.
            </span>
          </span>
        </label>
        <button type="button" onClick={salvar} disabled={salvando} className="bg-[#E1306C] hover:opacity-90 disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-xl">
          {salvando ? 'Salvando…' : 'Salvar regras'}
        </button>
        {msg && <p role="alert" className={`text-xs ${msg.ok ? 'text-[#4CAF7D]' : 'text-red-400'}`}>{msg.texto}</p>}
        <div className="text-[11px] text-[#A0A0B2] leading-relaxed border-t border-[#232230] pt-3">
          <p><b className="text-white">{premium.length}</b> local(is) premium elegível(is) para a faixa da Home (plano Premium/Fundador ativo ou fixado em Em Alta, com logo ou foto, fora do topo fixo).</p>
          <p className="mt-1">A faixa (avatares passando sozinhos, sem texto, abaixo dos ícones) mostra até {FAIXA_PREMIUM_MAX} locais por vez e só aparece com {FAIXA_PREMIUM_MIN} ou mais. {mostraFaixa ? 'Hoje ela aparece na Home.' : 'Hoje ela está escondida: no lugar aparece uma faixa fina com o que acontece hoje.'}</p>
          <p className="mt-1">Com mais de {FAIXA_PREMIUM_MAX} premium o grupo gira no intervalo escolhido acima; a ordem do ciclo muda uma vez por semana.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold text-sm mb-1">Topo fixo da Home (hoje)</h3>
          <p className="text-[11px] text-[#626274] mb-3">
            Fundadores sempre aparecem; a ordem muda uma vez por dia. {fundadoresL.length > fundMax ? `Há ${fundadoresL.length} fundadores e só ${fundMax} vagas: o grupo avança a cada dia.` : `${fundadoresL.length} fundador(es) de ${fundMax} vaga(s).`}
          </p>
          <p className="text-xs text-[#A0A0B2]">
            {topoHoje.length === 0 && 'Nenhum fundador com selo ativo. O topo some e a faixa de locais premium aparece primeiro.'}
            {topoHoje.map((x, i) => <span key={x.id}>{i > 0 ? ' · ' : ''}<b className="text-white">{x.nome}</b></span>)}
            {fixos.filter((l) => !idsFundadores.includes(l.id)).map((x) => <span key={x.id}> · {x.nome} (patrocinado)</span>)}
          </p>
        </div>

        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold text-sm mb-1">Em Alta na Home agora</h3>
          <p className="text-[11px] text-[#626274] mb-4">
            É a fileira de cartões com foto. Destaques primeiro, depois a rotação da hora; quem já está no topo fixo não se repete. Horário de Brasília.
          </p>
          <ul className="flex flex-col gap-3">
            {linhasEmAlta.map((ln, k) => (
              <li key={ln.slot} className={`text-xs rounded-xl p-3 border ${k === 0 ? 'border-[#FFD54F] bg-[#FFD54F]/5' : 'border-[#232230]'}`}>
                <p className="font-bold mb-2">{k === 0 ? 'Agora · ' : ''}{fmtHora(ln.inicio)}</p>
                {ln.cartoes.length === 0 && (
                  <p className="text-[#A0A0B2]">
                    Nenhum cartão: {completar ? 'não há locais com foto e nome válido para mostrar.' : 'ninguém com plano pago ou fixado, e o botão "completar vagas" está desligado.'}
                  </p>
                )}
                {k === 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ln.cartoes.map(({ l, motivo }) => {
                      const img = imagemDe(l);
                      const probs = problemasDe(l);
                      return (
                        <div key={l.id} className="flex items-center gap-3 rounded-lg bg-[#12121A] border border-[#232230] p-2">
                          {img ? (
                            <img src={img} alt="" className="w-12 h-12 rounded-md object-cover border border-[#232230] shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-[#232230] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{l.nome}</p>
                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${COR_MOTIVO[motivo]}`}>{ROTULO_MOTIVO[motivo]}</span>
                            {probs.length > 0 && <p className="text-[10px] text-red-400 mt-0.5">Corrigir: {probs.join(', ')}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[#A0A0B2]">
                    {ln.cartoes.map(({ l }, i) => (
                      <span key={l.id}>{i > 0 ? ' · ' : ''}<b className="text-white">{l.nome}</b></span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold text-sm mb-1">Faixa premium da Home: quem aparece agora e nas próximas horas</h3>
          <p className="text-[11px] text-[#626274] mb-4">Prévia pela regra, no horário de Brasília.</p>
          <ul className="flex flex-col gap-3">
            {linhas.map((ln, k) => (
              <li key={ln.slot} className={`text-xs rounded-xl p-3 border ${k === 0 ? 'border-[#E1306C] bg-[#E1306C]/10' : 'border-[#232230]'}`}>
                <p className="font-bold mb-1">
                  {k === 0 ? 'Agora · ' : ''}
                  {fmtHora(ln.inicio)}
                </p>
                <p className="text-[#A0A0B2]">
                  {ln.itens.length === 0 && `Faixa escondida (menos de ${FAIXA_PREMIUM_MIN} premium).`}
                  {ln.itens.map((x, i) => (
                    <span key={x.id}>
                      {i > 0 ? ' · ' : ''}
                      <b className="text-white">{x.nome}</b>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <h3 className="font-bold text-sm mb-1">Curadoria de Em Alta</h3>
          <p className="text-[11px] text-[#626274] mb-4 leading-relaxed">
            Fixar um local o coloca em Em Alta e na faixa premium (se tiver foto ou logo) sem criar plano pago nem cobrança. Quem tem plano pago ativo entra sozinho. O prazo vale para todas as marcações manuais do local (Em Alta, Hoje, Destaque da semana...).
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input className={`${campo} flex-1 min-w-[180px]`} placeholder="Buscar local pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <label className="text-xs text-[#A0A0B2] flex items-center gap-2">
              Prazo ao fixar
              <select className={campo} value={prazoDias} onChange={(e) => setPrazoDias(Number(e.target.value))}>
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
                <option value={0}>Sem prazo</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              ['todos', 'Todos'],
              ['fixados', 'Fixados'],
              ['pagos', 'Plano pago'],
              ['problemas', 'Com problema (foto ou nome)'],
            ] as const).map(([v, rot]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFiltro(v)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${filtro === v ? 'bg-[#FFD54F] border-[#FFD54F] text-black' : 'bg-[#12121A] border-[#232230] text-[#A0A0B2] hover:bg-[#1D1C29]'}`}
              >
                {rot}
              </button>
            ))}
          </div>
          {msgCur && <p role="alert" className={`text-xs mb-3 ${msgCur.ok ? 'text-[#4CAF7D]' : 'text-red-400'}`}>{msgCur.texto}</p>}
          {listaCuradoria.length === 0 && <p className="text-xs text-[#A0A0B2]">Nenhum local com esses filtros.</p>}
          <ul className="flex flex-col gap-2">
            {listaVisivel.map((l) => {
              const paga = pagaPlanoComDireitoADestaque(l);
              const fixado = estaFixadoEm(l, 'em_alta');
              const probs = problemasDe(l);
              const outras = (l.destaque_secoes ?? []).filter((s) => s !== 'em_alta').map((s) => ROTULO_SECAO[s] ?? s);
              const img = imagemDe(l);
              return (
                <li key={l.id} className="flex items-center gap-3 border border-[#232230] rounded-xl p-3 text-xs">
                  {img ? (
                    <img src={img} alt="" className="w-10 h-10 rounded-md object-cover border border-[#232230] shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-[#232230] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{l.nome}</p>
                    <p className="text-[#A0A0B2] flex flex-wrap gap-x-2 gap-y-1 mt-0.5">
                      <span>{ROTULO_CATEGORIA[l.categoria ?? ''] ?? l.categoria ?? '—'}</span>
                      {paga && <span className="text-[#4CAF7D] font-bold">Plano pago (entra sozinho)</span>}
                      {fixado && <span className="text-[#FFD54F] font-bold">{l.destaque_ate ? `Fixado até ${fmtData(l.destaque_ate)}` : 'Fixado sem prazo'}</span>}
                      {outras.length > 0 && <span>Outras marcações: {outras.join(', ')}</span>}
                      {probs.length > 0 && <span className="text-red-400">Corrigir: {probs.join(', ')}</span>}
                    </p>
                  </div>
                  {!paga && (
                    <button
                      type="button"
                      disabled={ocupado === l.id}
                      onClick={() => alternarFixacao(l, !fixado)}
                      className={`shrink-0 font-bold px-3 py-2 rounded-lg border disabled:opacity-50 ${fixado ? 'border-[#232230] text-[#A0A0B2] hover:bg-[#1D1C29]' : 'border-[#FFD54F] text-[#FFD54F] hover:bg-[#FFD54F]/10'}`}
                    >
                      {ocupado === l.id ? '…' : fixado ? 'Tirar' : 'Fixar'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {!mostrarTodos && listaCuradoria.length > 40 && (
            <button type="button" onClick={() => setMostrarTodos(true)} className="mt-3 text-xs font-bold text-[#E1306C]">
              Mostrar todos ({listaCuradoria.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
