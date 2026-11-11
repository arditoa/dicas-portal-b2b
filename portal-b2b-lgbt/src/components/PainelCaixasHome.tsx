'use client';
// Rodada 145 — "Rodízio e Destaques" organizado pelas caixas da Home (pedido da Andrea): uma aba por caixa
// (Em Alta, Recomendados, O que fazer hoje, Top da semana, Experiências, Serviços e as criadas pela equipe),
// com o que está dentro de cada uma e onde mexer. Nomes, ícones, ordem e caixas novas: "Editar caixas".
import { Loader2, Plus, Search, Settings2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIAS_SERVICO, EXPERIENCIAS_REAIS } from '../lib/destaque';
import EditorCaixasHome from './EditorCaixasHome';
import PainelRodizio from './PainelRodizio';

type CaixaRow = { chave: string; titulo: string; ativo: boolean; ordem: number; tipo: 'padrao' | 'curadoria' | 'link'; destino: string | null; cor1: string; cor2: string };
type Loc = { id: string; nome: string; bairro: string | null; cidade: string | null; categoria: string; destaque_secoes: string[] | null; destaque_ate: string | null; plano_destaque: string | null; plano_comercial: string | null; plano_comercial_status: string | null; experiencias: string[] | null; logo_url: string | null; foto_capa_url: string | null };

const PADRAO: CaixaRow[] = [
  { chave: 'em-alta', titulo: 'Em Alta', ativo: true, ordem: 1, tipo: 'padrao', destino: null, cor1: '#CC7A0A', cor2: '#9A4A0A' },
  { chave: 'recomendados', titulo: 'Recomendados', ativo: true, ordem: 2, tipo: 'padrao', destino: null, cor1: '#0DA372', cor2: '#0E7490' },
  { chave: 'hoje', titulo: 'O que fazer hoje', ativo: true, ordem: 3, tipo: 'padrao', destino: null, cor1: '#C026A3', cor2: '#6D3FD1' },
  { chave: 'semana', titulo: 'Top da semana', ativo: true, ordem: 4, tipo: 'padrao', destino: null, cor1: '#F2692A', cor2: '#C42660' },
  { chave: 'experiencia', titulo: 'Experiências', ativo: true, ordem: 5, tipo: 'padrao', destino: null, cor1: '#0A8FD0', cor2: '#7048B8' },
  { chave: 'servicos', titulo: 'Serviços', ativo: true, ordem: 6, tipo: 'padrao', destino: null, cor1: '#0F9F90', cor2: '#5558E3' },
];

// Regra de cada caixa padrão (o que o app faz sozinho) e qual marcação da ficha a equipe controla.
const REGRA: Record<string, { texto: string; secao?: string }> = {
  recomendados: { texto: 'Locais com o Selo Dicas LGBT+: curadoria da equipe, nunca venda. Recomendação: até 8.', secao: 'selo_dicas' },
  hoje: { texto: 'Entram sozinhas as festas de hoje e a agenda dos bares. Aqui você fixa locais que também devem aparecer hoje.', secao: 'hoje' },
  semana: { texto: 'Entram sozinhos os Fundadores e Premium ativos. Aqui você fixa outros locais como destaque da semana.', secao: 'destaque' },
  experiencia: { texto: 'Locais que têm alguma experiência marcada na ficha (até 3 por local). Para mudar, abra a ficha do local em Locais e marcas.' },
  servicos: { texto: 'Todos os locais das categorias Serviços e Lojas, com plano pago primeiro.' },
};

const pago = (l: Loc) => (l.plano_comercial === 'fundador' || l.plano_comercial === 'premium') && (l.plano_comercial_status ?? 'ativo') === 'ativo';
const lugar = (l: Loc) => [l.bairro, l.cidade].filter(Boolean).join(', ');

function Miniatura({ l }: { l: Loc }) {
  const img = l.foto_capa_url || l.logo_url;
  return img ? <img src={img} alt="" className="w-8 h-8 rounded-md object-cover border border-[#232230] shrink-0" /> : <span className="w-8 h-8 rounded-md bg-[#232230] shrink-0" />;
}

// Lista de quem está marcado numa seção da ficha (destaque_secoes), com remover e adicionar pela busca.
function GestorSecao({ secao, locais, onMudou }: { secao: string; locais: Loc[]; onMudou: (id: string, secoes: string[]) => void }) {
  const [busca, setBusca] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const marcados = locais.filter((l) => (l.destaque_secoes || []).includes(secao));
  const q = busca.trim().toLowerCase();
  const sugestoes = q.length < 2 ? [] : locais.filter((l) => !(l.destaque_secoes || []).includes(secao) && [l.nome, l.bairro, l.cidade].some((t) => (t || '').toLowerCase().includes(q))).slice(0, 8);
  const alternar = async (l: Loc, marcar: boolean) => {
    setOcupado(l.id); setErro('');
    const novas = marcar ? Array.from(new Set([...(l.destaque_secoes || []), secao])) : (l.destaque_secoes || []).filter((s) => s !== secao);
    const { error } = await supabase.from('locais').update({ destaque_secoes: novas }).eq('id', l.id);
    setOcupado(null);
    if (error) { setErro(error.message); return; }
    onMudou(l.id, novas);
    if (marcar) setBusca('');
  };
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-2.5 text-[#626274]" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Adicionar local: digite o nome..." className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs pl-8 pr-3 py-2 focus:outline-none focus:border-[#E1306C]" />
        {sugestoes.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-[#0B0B0E] border border-[#232230] rounded-lg overflow-hidden">
            {sugestoes.map((l) => (
              <button key={l.id} type="button" onClick={() => alternar(l, true)} className="w-full text-left px-3 py-2 text-xs hover:bg-[#1D1C2A] flex items-center gap-2">
                <Plus size={12} className="text-[#E1306C]" /> <b>{l.nome}</b> <span className="text-[#8888A0]">{lugar(l)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
      {marcados.length === 0 ? <p className="text-[11px] text-[#626274]">Nenhum local marcado pela equipe.</p> : (
        <ul className="grid sm:grid-cols-2 gap-1.5">
          {marcados.map((l) => (
            <li key={l.id} className="flex items-center gap-2 rounded-lg border border-[#232230] p-1.5">
              <Miniatura l={l} />
              <div className="min-w-0 flex-1"><p className="text-xs font-bold truncate">{l.nome}</p><p className="text-[10px] text-[#8888A0] truncate">{lugar(l)}</p></div>
              <button type="button" title="Tirar da caixa" disabled={ocupado === l.id} onClick={() => alternar(l, false)} className="p-1 text-[#A0A0B2] hover:text-red-400 disabled:opacity-30">{ocupado === l.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListaSimples({ itens, extra }: { itens: Loc[]; extra?: (l: Loc) => string }) {
  if (itens.length === 0) return <p className="text-[11px] text-[#626274]">Nenhum local nesta caixa agora.</p>;
  return (
    <ul className="grid sm:grid-cols-2 gap-1.5">
      {itens.map((l) => (
        <li key={l.id} className="flex items-center gap-2 rounded-lg border border-[#232230] p-1.5">
          <Miniatura l={l} />
          <div className="min-w-0 flex-1"><p className="text-xs font-bold truncate">{l.nome}</p><p className="text-[10px] text-[#8888A0] truncate">{extra ? extra(l) : lugar(l)}</p></div>
        </li>
      ))}
    </ul>
  );
}

export default function PainelCaixasHome({ extraDestaques }: { extraDestaques?: React.ReactNode }) {
  const [caixas, setCaixas] = useState<CaixaRow[]>(PADRAO);
  const [sel, setSel] = useState('em-alta');
  const [editar, setEditar] = useState(false);
  const [locais, setLocais] = useState<Loc[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarCaixas = useCallback(async () => {
    const { data, error } = await supabase.from('home_caixas').select('chave, titulo, ativo, ordem, tipo, destino, cor1, cor2');
    if (!error && data && data.length) setCaixas((data as CaixaRow[]).sort((a, b) => a.ordem - b.ordem));
  }, []);
  useEffect(() => {
    carregarCaixas();
    (async () => {
      const { data } = await supabase.from('locais')
        .select('id, nome, bairro, cidade, categoria, destaque_secoes, destaque_ate, plano_destaque, plano_comercial, plano_comercial_status, experiencias, logo_url, foto_capa_url')
        .eq('status', 'aprovado').order('nome').limit(2000);
      setLocais((data as Loc[]) || []);
      setCarregando(false);
    })();
  }, [carregarCaixas]);

  const mudou = (id: string, secoes: string[]) => setLocais((ls) => ls.map((l) => (l.id === id ? { ...l, destaque_secoes: secoes } : l)));
  const caixa = caixas.find((c) => c.chave === sel) || caixas[0];
  const expRotulo = useMemo(() => Object.fromEntries(EXPERIENCIAS_REAIS.map((e) => [e.slug, e.label])), []);

  const conteudo = () => {
    if (sel === '__destaques') return extraDestaques;
    if (!caixa) return null;
    if (caixa.chave === 'em-alta') return <PainelRodizio />;
    if (caixa.tipo === 'link') return <p className="text-xs text-[#A0A0B2]">Esta caixa abre <b className="text-white">{caixa.destino}</b>. Para trocar o destino, use &quot;Editar caixas&quot;.</p>;
    if (caixa.tipo === 'curadoria') return <GestorSecao secao={`caixa:${caixa.chave}`} locais={locais} onMudou={mudou} />;
    const r = REGRA[caixa.chave];
    let automaticos: Loc[] = [];
    if (caixa.chave === 'semana') automaticos = locais.filter(pago);
    if (caixa.chave === 'experiencia') automaticos = locais.filter((l) => (l.experiencias || []).length > 0 && !CATEGORIAS_SERVICO.includes(l.categoria));
    if (caixa.chave === 'servicos') automaticos = locais.filter((l) => CATEGORIAS_SERVICO.includes(l.categoria)).sort((a, b) => Number(pago(b)) - Number(pago(a)));
    return (
      <div className="space-y-3">
        {r && <p className="text-[11px] text-[#A0A0B2]">{r.texto}</p>}
        {(caixa.chave === 'semana' || caixa.chave === 'experiencia' || caixa.chave === 'servicos') && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#626274] mb-1.5">{caixa.chave === 'semana' ? 'Entram sozinhos (plano pago)' : 'Na caixa agora'} · {automaticos.length}</p>
            <ListaSimples itens={automaticos} extra={caixa.chave === 'experiencia' ? (l) => (l.experiencias || []).map((x) => expRotulo[x] || x).join(' · ') : undefined} />
          </div>
        )}
        {r?.secao && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#626274] mb-1.5">Escolhidos pela equipe</p>
            <GestorSecao secao={r.secao} locais={locais} onMudou={mudou} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#161520] border border-[#232230] rounded-xl p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#A0A0B2]">Caixas da Home, na ordem do app</p>
          <button type="button" onClick={() => setEditar((v) => !v)} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border ${editar ? 'bg-[#E1306C] border-[#E1306C] text-white' : 'border-[#232230] text-[#A0A0B2] hover:text-white'}`}>
            <Settings2 size={12} /> {editar ? 'Fechar edição' : 'Editar caixas (nome, cor, ordem, nova)'}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {caixas.map((c) => (
            <button key={c.chave} type="button" onClick={() => setSel(c.chave)} className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg border text-xs font-bold transition ${sel === c.chave ? 'border-[#E1306C] bg-[#E1306C]/10 text-white' : 'border-[#232230] text-[#C9C9D6] hover:border-[#E1306C]/50'} ${c.ativo ? '' : 'opacity-50'}`}>
              <span className="w-5 h-5 rounded" style={{ background: `linear-gradient(135deg, ${c.cor1}, ${c.cor2})` }} />
              {c.titulo}{!c.ativo && <span className="text-[9px] font-semibold text-[#8888A0]">oculta</span>}
            </button>
          ))}
          {extraDestaques && (
            <button type="button" onClick={() => setSel('__destaques')} className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${sel === '__destaques' ? 'border-[#FFD54F] bg-[#FFD54F]/10 text-[#FFD54F]' : 'border-[#232230] text-[#FFD54F]/80 hover:border-[#FFD54F]/50'}`}>
              ⚡ Bloco Destaques (oferta)
            </button>
          )}
        </div>
      </div>
      {editar && <EditorCaixasHome />}
      {carregando && sel !== 'em-alta' && sel !== '__destaques' ? <Loader2 className="animate-spin text-[#A0A0B2]" size={16} /> : (
        sel === 'em-alta' || sel === '__destaques' ? conteudo() : (
          <div className="bg-[#161520] border border-[#232230] rounded-xl p-4">
            <p className="text-sm font-bold mb-2">{caixa?.titulo}</p>
            {conteudo()}
          </div>
        )
      )}
    </div>
  );
}
