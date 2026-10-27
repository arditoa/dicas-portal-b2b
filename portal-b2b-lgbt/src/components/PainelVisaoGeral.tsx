'use client';
// Rodada 89 — "Visão geral" do /admin: números do negócio num só lugar.
// Fontes: locais/eventos/leads (cadastros e carteira), eventos_analytics (visualizações e cliques
// por local) e uso_telas (tempo por tela, ANÔNIMO — migration 048). Feito para continuar legível
// com 100+ locais por categoria: tabelas com busca, filtro por categoria e "mostrar mais".
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { pagaPlanoComDireitoADestaque } from '../lib/destaque';

type Aba = string;
type Props = { pendencias: number; onIrPara: (aba: Aba) => void };

type LocalResumo = {
  id: string;
  categoria: string | null;
  cidade: string | null;
  plano_comercial: string | null;
  plano_comercial_status: string | null;
  foto_capa_url: string | null;
  logo_url: string | null;
  galeria_fotos: string[] | null;
};
type UsoTela = { tela: string; aparelhos: number; passagens: number; media_seg: number; total_seg: number };
type UsoDia = { dia: string; aparelhos: number; sessoes: number; passagens: number; total_seg: number };
type RankLocal = {
  local_id: string; nome: string; categoria: string | null; cidade: string | null;
  visualizacoes: number; cliques_instagram: number; cliques_cupom: number; media_seg: number | null; passagens: number;
};

const CATEGORIA: Record<string, string> = {
  lugares: 'Bares', gastronomia: 'Gastronomia', cultura: 'Cultura', turismo: 'Dicas Trip',
  beleza: 'Beleza', lojas: 'Lojas', servicos: 'Serviços', produtos: 'Produtos', educacao: 'Educação', lazer: 'Lazer', eventos: 'Eventos',
};
const TELA: Record<string, string> = {
  home: 'Início (Home)', mapa: 'Mapa', eventos: 'Eventos (aba)', trip: 'Dicas Trip', conta: 'Conta',
  categoria: 'Lista de categoria', perfil_local: 'Página do local', secao: 'Em Alta / Hoje / Semana',
  experiencia: 'Experiências e selos', evento: 'Página do evento', busca: 'Busca', roteiro: 'Roteiro', destino: 'Destino', outras: 'Outras',
};

const PERIODOS = [7, 30, 90] as const;

function fmtTempo(seg: number | null | undefined): string {
  if (seg == null) return '—';
  const s = Math.round(seg);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min ${String(s % 60).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, '0')}min`;
}
const n = (v: number | null | undefined) => (v ?? 0).toLocaleString('pt-BR');

function Cartao({ titulo, valor, sub, destaque, onClick }: { titulo: string; valor: string; sub?: string; destaque?: boolean; onClick?: () => void }) {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-[#161520] border rounded-xl p-4 ${destaque ? 'border-[#E1306C]/60' : 'border-[#232230]'} ${onClick ? 'hover:bg-[#1D1C29] transition' : ''}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8888A0]">{titulo}</p>
      <p className="text-2xl font-black mt-1">{valor}</p>
      {sub && <p className="text-[11px] text-[#626274] mt-0.5">{sub}</p>}
    </Tag>
  );
}

export default function PainelVisaoGeral({ pendencias, onIrPara }: Props) {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [carregando, setCarregando] = useState(true);
  const [locais, setLocais] = useState<LocalResumo[]>([]);
  const [eventosFuturos, setEventosFuturos] = useState<number | null>(null);
  const [leadsNovos, setLeadsNovos] = useState<number | null>(null);
  const [dispositivosPush, setDispositivosPush] = useState<number | null>(null);
  const [avisosInteresse, setAvisosInteresse] = useState<number | null>(null);
  const [uso, setUso] = useState<UsoTela[] | null>(null);
  const [diario, setDiario] = useState<UsoDia[]>([]);
  const [ranking, setRanking] = useState<RankLocal[]>([]);
  const [erroUso, setErroUso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const contar = (q: PromiseLike<{ count: number | null; error: unknown }>) => q.then((r) => (r.error ? null : r.count));
    const [loc, ev, ld, push, av, u, d, r] = await Promise.all([
      supabase.from('locais').select('id, categoria, cidade, plano_comercial, plano_comercial_status, foto_capa_url, logo_url, galeria_fotos').eq('status', 'aprovado').limit(5000),
      contar(supabase.from('eventos').select('id', { count: 'exact', head: true }).eq('status', 'aprovado').gte('data_inicio', new Date().toISOString())),
      contar(supabase.from('leads_institucionais').select('id', { count: 'exact', head: true }).eq('status', 'novo')),
      contar(supabase.from('push_dispositivos').select('*', { count: 'exact', head: true })),
      contar(supabase.from('avisos_interesse').select('*', { count: 'exact', head: true })),
      supabase.rpc('resumo_uso_telas', { p_dias: dias }),
      supabase.rpc('uso_diario', { p_dias: dias }),
      supabase.rpc('ranking_locais', { p_dias: dias }),
    ]);
    setLocais(((loc.data as LocalResumo[]) || []));
    setEventosFuturos(ev); setLeadsNovos(ld); setDispositivosPush(push); setAvisosInteresse(av);
    if (u.error) {
      setErroUso('Medição de uso indisponível: rode a migration 048 no Supabase.');
      setUso(null); setDiario([]); setRanking([]);
    } else {
      setErroUso(null);
      setUso(((u.data as UsoTela[]) || []).map((x) => ({ ...x, media_seg: Number(x.media_seg) })));
      setDiario(((d.data as UsoDia[]) || []));
      setRanking(((r.data as RankLocal[]) || []).map((x) => ({ ...x, media_seg: x.media_seg == null ? null : Number(x.media_seg) })));
    }
    setCarregando(false);
  }, [dias]);
  useEffect(() => { carregar(); }, [carregar]);

  // ---- carteira de locais ----
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { total: number; pagos: number; semFoto: number }>();
    for (const l of locais) {
      const k = l.categoria || 'outros';
      const c = mapa.get(k) || { total: 0, pagos: 0, semFoto: 0 };
      c.total++;
      if (pagaPlanoComDireitoADestaque(l as any)) c.pagos++;
      if (!l.foto_capa_url && !l.logo_url && !(l.galeria_fotos && l.galeria_fotos.length)) c.semFoto++;
      mapa.set(k, c);
    }
    return [...mapa.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [locais]);
  const porCidade = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of locais) mapa.set(l.cidade || '—', (mapa.get(l.cidade || '—') || 0) + 1);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [locais]);
  const totalPagos = locais.filter((l) => pagaPlanoComDireitoADestaque(l as any)).length;
  const totalSemFoto = porCategoria.reduce((s, [, c]) => s + c.semFoto, 0);

  // ---- uso ----
  const totalSeg = (uso || []).reduce((s, x) => s + Number(x.total_seg), 0);
  const maxSegTela = Math.max(1, ...(uso || []).map((x) => Number(x.total_seg)));
  const aparelhosPeriodo = Math.max(0, ...diario.map((x) => Number(x.aparelhos)));
  const sessoesPeriodo = diario.reduce((s, x) => s + Number(x.sessoes), 0);
  const home = (uso || []).find((x) => x.tela === 'home');
  const semDadosUso = !erroUso && (uso || []).length === 0;
  const maxAparelhosDia = Math.max(1, ...diario.map((x) => Number(x.aparelhos)));

  // ---- ranking ----
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('todas');
  const [ordem, setOrdem] = useState<'mais' | 'menos'>('mais');
  const [limite, setLimite] = useState(10);
  const rankFiltrado = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const lista = ranking.filter((x) => (cat === 'todas' || x.categoria === cat) && (!t || x.nome.toLowerCase().includes(t) || (x.cidade || '').toLowerCase().includes(t)));
    return ordem === 'mais' ? lista : [...lista].reverse();
  }, [ranking, busca, cat, ordem]);
  useEffect(() => setLimite(10), [busca, cat, ordem, dias]);

  if (carregando && locais.length === 0) return <Loader2 className="w-5 h-5 animate-spin text-[#A0A0B2]" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#8888A0]">Números do app e da carteira de parceiros. Medição de uso é anônima (sem nome nem login).</p>
        <div className="flex gap-1 bg-[#161520] border border-[#232230] rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button key={p} onClick={() => setDias(p)} className={`text-xs font-bold px-3 py-1.5 rounded-md transition ${dias === p ? 'bg-[#E1306C] text-white' : 'text-[#A0A0B2] hover:text-white'}`}>
              {p} dias
            </button>
          ))}
        </div>
      </div>

      {/* Atenção agora */}
      <section>
        <h2 className="text-sm font-bold mb-3">Precisa da sua atenção</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Cartao titulo="Aprovações pendentes" valor={n(pendencias)} sub={pendencias ? 'Abrir fila' : 'Fila zerada'} destaque={pendencias > 0} onClick={() => onIrPara('aprovacoes')} />
          <Cartao titulo="Leads novos" valor={leadsNovos == null ? '—' : n(leadsNovos)} sub="Organizações e apoiadores" onClick={() => onIrPara('aprovacoes')} />
          <Cartao titulo="Locais sem foto" valor={n(totalSemFoto)} sub="Sem capa, logo ou galeria" onClick={() => onIrPara('locais')} />
          <Cartao titulo="“Avise-me” (Copa 2027)" valor={avisosInteresse == null ? '—' : n(avisosInteresse)} sub="Pessoas que pediram aviso" />
        </div>
      </section>

      {/* Carteira */}
      <section>
        <h2 className="text-sm font-bold mb-3">Carteira de parceiros</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Cartao titulo="Locais aprovados" valor={n(locais.length)} onClick={() => onIrPara('locais')} />
          <Cartao titulo="Planos pagos ativos" valor={n(totalPagos)} sub={locais.length ? `${Math.round((totalPagos / locais.length) * 100)}% da carteira` : undefined} />
          <Cartao titulo="Eventos futuros" valor={eventosFuturos == null ? '—' : n(eventosFuturos)} onClick={() => onIrPara('eventos')} />
          <Cartao titulo="Aparelhos com aviso (push)" valor={dispositivosPush == null ? '—' : n(dispositivosPush)} onClick={() => onIrPara('push')} />
        </div>
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-[#161520] border border-[#232230] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="text-[#8888A0] text-left">
                <tr><th className="px-4 py-2.5 font-bold">Categoria</th><th className="px-2 py-2.5 font-bold text-right">Locais</th><th className="px-2 py-2.5 font-bold text-right">Pagos</th><th className="px-4 py-2.5 font-bold text-right">Sem foto</th></tr>
              </thead>
              <tbody>
                {porCategoria.map(([k, c]) => (
                  <tr key={k} className="border-t border-[#232230]">
                    <td className="px-4 py-2.5 font-bold">{CATEGORIA[k] || k}</td>
                    <td className="px-2 py-2.5 text-right">{n(c.total)}</td>
                    <td className="px-2 py-2.5 text-right text-[#4CAF7D]">{n(c.pagos)}</td>
                    <td className={`px-4 py-2.5 text-right ${c.semFoto ? 'text-amber-400' : 'text-[#626274]'}`}>{n(c.semFoto)}</td>
                  </tr>
                ))}
                {porCategoria.length === 0 && <tr><td className="px-4 py-3 text-[#626274]" colSpan={4}>Nenhum local aprovado ainda.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="bg-[#161520] border border-[#232230] rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#8888A0] mb-2">Por cidade</p>
            <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
              {porCidade.slice(0, 30).map(([c, q]) => (
                <li key={c} className="flex justify-between gap-2"><span className="truncate">{c}</span><b>{n(q)}</b></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Uso do app */}
      <section>
        <h2 className="text-sm font-bold mb-3">Uso do app · últimos {dias} dias</h2>
        {erroUso && <p className="text-xs text-amber-400 mb-3">{erroUso}</p>}
        {semDadosUso && (
          <p className="text-xs text-[#A0A0B2] bg-[#161520] border border-dashed border-[#232230] rounded-xl p-4 mb-3">
            Ainda sem dados de tempo nas telas. A medição começa a gravar quando o app com a versão nova estiver publicado
            (em desenvolvimento/Expo Go ela fica desligada para não sujar os números).
          </p>
        )}
        {uso && uso.length > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Cartao titulo="Aparelhos ativos (pico/dia)" valor={n(aparelhosPeriodo)} />
              <Cartao titulo="Sessões" valor={n(sessoesPeriodo)} sub="Cada abertura do app" />
              <Cartao titulo="Tempo médio na Home" valor={fmtTempo(home?.media_seg)} sub={home ? `${n(home.passagens)} passagens` : undefined} />
              <Cartao titulo="Tempo total no app" valor={fmtTempo(totalSeg)} />
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="bg-[#161520] border border-[#232230] rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="text-[#8888A0] text-left">
                    <tr><th className="px-4 py-2.5 font-bold">Tela</th><th className="px-2 py-2.5 font-bold text-right">Aparelhos</th><th className="px-2 py-2.5 font-bold text-right">Média</th><th className="px-4 py-2.5 font-bold text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {uso.map((x) => (
                      <tr key={x.tela} className="border-t border-[#232230]">
                        <td className="px-4 py-2.5">
                          <p className="font-bold">{TELA[x.tela] || x.tela}</p>
                          <div className="h-1 rounded bg-[#232230] mt-1.5"><div className="h-1 rounded bg-[#E1306C]" style={{ width: `${(Number(x.total_seg) / maxSegTela) * 100}%` }} /></div>
                        </td>
                        <td className="px-2 py-2.5 text-right">{n(x.aparelhos)}</td>
                        <td className="px-2 py-2.5 text-right">{fmtTempo(x.media_seg)}</td>
                        <td className="px-4 py-2.5 text-right">{fmtTempo(Number(x.total_seg))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-[#161520] border border-[#232230] rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#8888A0] mb-3">Aparelhos ativos por dia</p>
                <div className="flex items-end gap-[3px] h-40">
                  {diario.map((x) => (
                    <div key={x.dia} className="flex-1 min-w-[3px] bg-[#7E57C2] rounded-t hover:bg-[#E1306C]" style={{ height: `${Math.max(4, (Number(x.aparelhos) / maxAparelhosDia) * 100)}%` }} title={`${new Date(x.dia + 'T12:00:00').toLocaleDateString('pt-BR')}: ${x.aparelhos} aparelhos · ${fmtTempo(Number(x.total_seg))}`} />
                  ))}
                </div>
                <p className="text-[11px] text-[#626274] mt-2">Passe o mouse em cada barra para ver o dia, os aparelhos e o tempo total.</p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Ranking de locais */}
      <section>
        <h2 className="text-sm font-bold mb-1">Desempenho dos locais</h2>
        <p className="text-xs text-[#626274] mb-3">Visualizações do perfil, cliques e tempo médio na página. Use “Menos vistos” para achar quem precisa de ajuda (foto, descrição, destaque).</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar local ou cidade…" className="flex-1 min-w-[180px] bg-[#161520] border border-[#232230] rounded-lg text-xs px-3 py-2" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-[#161520] border border-[#232230] rounded-lg text-xs px-3 py-2">
            <option value="todas">Todas as categorias</option>
            {Object.entries(CATEGORIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as 'mais' | 'menos')} className="bg-[#161520] border border-[#232230] rounded-lg text-xs px-3 py-2">
            <option value="mais">Mais vistos</option>
            <option value="menos">Menos vistos</option>
          </select>
        </div>
        <div className="bg-[#161520] border border-[#232230] rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead className="text-[#8888A0] text-left">
              <tr>
                <th className="px-4 py-2.5 font-bold">Local</th><th className="px-2 py-2.5 font-bold">Categoria</th>
                <th className="px-2 py-2.5 font-bold text-right">Visualizações</th><th className="px-2 py-2.5 font-bold text-right">Instagram</th>
                <th className="px-2 py-2.5 font-bold text-right">Cupom</th><th className="px-4 py-2.5 font-bold text-right">Tempo médio</th>
              </tr>
            </thead>
            <tbody>
              {rankFiltrado.slice(0, limite).map((x) => (
                <tr key={x.local_id} className="border-t border-[#232230]">
                  <td className="px-4 py-2.5"><p className="font-bold truncate max-w-[220px]">{x.nome}</p><p className="text-[#626274]">{x.cidade}</p></td>
                  <td className="px-2 py-2.5">{CATEGORIA[x.categoria || ''] || x.categoria}</td>
                  <td className="px-2 py-2.5 text-right">{n(x.visualizacoes)}</td>
                  <td className="px-2 py-2.5 text-right">{n(x.cliques_instagram)}</td>
                  <td className="px-2 py-2.5 text-right">{n(x.cliques_cupom)}</td>
                  <td className="px-4 py-2.5 text-right">{fmtTempo(x.media_seg)}</td>
                </tr>
              ))}
              {rankFiltrado.length === 0 && <tr><td className="px-4 py-3 text-[#626274]" colSpan={6}>{erroUso ? 'Sem dados (migration 048 pendente).' : 'Nenhum local encontrado.'}</td></tr>}
            </tbody>
          </table>
        </div>
        {rankFiltrado.length > limite && (
          <button onClick={() => setLimite((l) => l + 25)} className="mt-3 text-xs font-bold text-[#E1306C]">Mostrar mais ({rankFiltrado.length - limite} restantes)</button>
        )}
      </section>
    </div>
  );
}
