'use client';
// Ações de marca (migração 117) — /admin › Ações de marca.
// A equipe cria a campanha de um patrocinador (marca, período, investimento e, se quiser, 1 pergunta de pesquisa),
// etiqueta os cupons, festas e banners que fazem parte dela e gera o relatório: funil (viu → clicou → se interessou
// → foi), custo por presença e perfil somado de quem FOI. Só números somados e anônimos (mesmas regras da 114).
import { FileDown, Link2, Loader2, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Num = number | string;
type Acao = {
  id: string; marca: string; nome: string; inicio: string; fim: string; investimento: number | null;
  objetivo: string | null; pesquisa_pergunta: string | null; pesquisa_opcoes: string[] | null; ativa: boolean;
  chamada?: string | null; cor?: string | null; logo_url?: string | null; mostrar_no_app?: boolean;
};
type Item = { id: string; titulo: string; extra?: string; acao_marca_id: string | null };
type Pergunta = { id: string; texto: string; tipo: 'escolha' | 'nota' | 'aberta'; opcoes?: string[] };
type PerguntaForm = { texto: string; tipo: 'escolha' | 'nota' | 'aberta'; opcoes: string };
type ResQ = { responderam: Num; perguntas: { id: string; texto: string; tipo: string; responderam: Num; opcoes?: { valor: string; n: Num }[]; media?: number | null; promotores?: number | null; detratores?: number | null; textos?: string[] | null }[] };
// Modelo pronto: o que as marcas querem saber num lançamento/sampling de produto.
const MODELO_LANCAMENTO: PerguntaForm[] = [
  { texto: 'Você já conhecia o produto antes de hoje?', tipo: 'escolha', opcoes: 'Sim, já comprei, Conhecia mas nunca comprei, Não conhecia' },
  { texto: 'De 0 a 10, quanto você gostou?', tipo: 'nota', opcoes: '' },
  { texto: 'Você compraria?', tipo: 'escolha', opcoes: 'Com certeza, Talvez, Não' },
  { texto: 'De 0 a 10, quanto você recomendaria a um amigo?', tipo: 'nota', opcoes: '' },
  { texto: 'O que você mudaria no produto?', tipo: 'aberta', opcoes: '' },
];
const MODELO_LEMBRANCA: PerguntaForm[] = [
  { texto: 'Qual marca patrocinou a ação?', tipo: 'escolha', opcoes: '[SUA MARCA], [CONCORRENTE 1], [CONCORRENTE 2], Não lembro' },
  { texto: 'De 0 a 10, quanto a ação combinou com a comunidade LGBT+?', tipo: 'nota', opcoes: '' },
];
type Escolhas = { pergunta: string; total: Num; opcoes: { valor: string; n: Num }[] };
type Rel = { escolhas?: Escolhas | null;
  acao: Acao; gerado_em: string;
  itens: { cupons: { id: string; titulo: string; local: string | null }[]; festas: { id: string; titulo: string; data: string }[]; banners: { id: string; titulo: string }[] };
  funil: Record<string, Num>;
  custo_por_presenca: number | null;
  aceitam_ofertas_de_marcas: Num;
  pesquisa: { pergunta: string; responderam: Num; respostas: { valor: string; n: Num }[] } | null;
  fotos?: { fotos: number; compartilhadas: number; salvas: number; checkins?: number } | null;
  questionario?: ResQ | null;
  perfil: { status: 'ok' | 'dados_insuficientes'; idade?: Record<string, Num>; chegada_hora?: { hora: number; n: Num }[]; chegada_dia?: { dia: number; n: Num }[];
    genero?: { consentiram: Num; grupos: { valor: string; n: Num }[] }; orientacao?: { consentiram: Num; grupos: { valor: string; n: Num }[] } };
};

const FUNIL: [string, string, string][] = [
  ['Viu', 'banner_exibicoes', 'Exibições do banner'],
  ['Viu', 'festa_visitas', 'Visitas às festas'],
  ['Clicou', 'banner_cliques', 'Cliques no banner'],
  ['Clicou', 'ingresso_cliques', 'Cliques no ingresso'],
  ['Se interessou', 'eu_vou', 'Marcaram "Eu vou"'],
  ['Se interessou', 'lista_entraram_na_lista', 'Entraram na Lista VIP'],
  ['Foi', 'cupons_usados', 'Cupons usados no bar'],
  ['Foi', 'entradas_lista', 'Entradas pela Lista VIP'],
  ['Foi', 'pessoas_que_foram', 'Pessoas que foram (únicas)'],
];
const IDADES = ['18–24', '25–34', '35–44', '45+'];
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const br = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const t = (n: Num | undefined | null) => (n == null ? '—' : typeof n === 'number' ? n.toLocaleString('pt-BR') : n);
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const bar = (n: Num | undefined) => (typeof n === 'number' ? n : n ? 5 : 0);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const VAZIA = { marca: '', nome: '', inicio: '', fim: '', investimento: '', objetivo: '', chamada: '', cor: '', logo: '', moldura: '', molduraTexto: '', brindePergunta: '', brindeOpcoes: '', participacao: 'ambos', brinde: '', limite: '', regra: '' };

function Barras({ itens }: { itens: { rotulo: string; n: Num | undefined }[] }) {
  const max = Math.max(1, ...itens.map((i) => bar(i.n)));
  if (!itens.length) return <p className="text-xs text-[#626274]">Ainda poucas respostas (grupos com menos de 10 não aparecem).</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {itens.map((i) => (
        <div key={i.rotulo} className="flex items-center gap-2 text-xs">
          <span className="w-32 text-[#A0A0B2] truncate">{i.rotulo}</span>
          <div className="flex-1 h-2.5 bg-[#232230] rounded-full overflow-hidden">
            <div className={`h-full bg-[#E1306C] rounded-full ${typeof i.n !== 'number' ? 'opacity-30' : ''}`} style={{ width: `${Math.max(2, Math.round((bar(i.n) / max) * 100))}%` }} />
          </div>
          <b className="w-28 text-right">{t(i.n)}</b>
        </div>
      ))}
    </div>
  );
}

export default function PainelAcoesMarca() {
  const [acoes, setAcoes] = useState<Acao[] | null>(null);
  const [erroTabela, setErroTabela] = useState('');
  const [nova, setNova] = useState(VAZIA);
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([]);
  const [criando, setCriando] = useState(false);
  const [sel, setSel] = useState<Acao | null>(null);
  const [cupons, setCupons] = useState<Item[]>([]);
  const [festas, setFestas] = useState<Item[]>([]);
  const [banners, setBanners] = useState<Item[]>([]);
  const [rel, setRel] = useState<Rel | null>(null);
  // Migração 127 — fotos com a moldura que as pessoas ENVIARAM para a marca (só admin vê; entregamos à marca).
  const [fotosMarca, setFotosMarca] = useState<{ id: string; url: string | null; baixar: string | null; pode: boolean; quando: string }[]>([]);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('acoes_marca').select('*').order('inicio', { ascending: false });
    if (error) { setErroTabela('Rode a migração 117 (ações de marca) no Supabase para usar esta tela.'); setAcoes([]); return; }
    setAcoes(data as Acao[]);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const carregarItens = useCallback(async () => {
    const desde = new Date(Date.now() - 60 * 864e5).toISOString();
    const [c, f, b] = await Promise.all([
      supabase.from('cupons').select('id, titulo, acao_marca_id, locais(nome)').eq('ativo', true).order('created_at', { ascending: false }).limit(300),
      supabase.from('eventos').select('id, titulo, data_inicio, acao_marca_id').gte('data_inicio', desde).order('data_inicio', { ascending: true }).limit(300),
      supabase.from('banners_app').select('id, titulo, chave, acao_marca_id').order('created_at', { ascending: false }).limit(200),
    ]);
    setCupons(((c.data as any[]) || []).map((x) => ({ id: x.id, titulo: x.titulo, extra: x.locais?.nome, acao_marca_id: x.acao_marca_id })));
    setFestas(((f.data as any[]) || []).map((x) => ({ id: x.id, titulo: x.titulo, extra: br(x.data_inicio), acao_marca_id: x.acao_marca_id })));
    setBanners(((b.data as any[]) || []).map((x) => ({ id: x.id, titulo: x.titulo || x.chave, acao_marca_id: x.acao_marca_id })));
  }, []);
  useEffect(() => { if (sel) { void carregarItens(); setRel(null); setErro(''); } }, [sel, carregarItens]);

  async function criar() {
    setErro('');
    if (!nova.marca.trim() || !nova.nome.trim() || !nova.inicio || !nova.fim) return setErro('Preencha marca, nome e período.');
    const montadas: Pergunta[] = [];
    for (const [i, q] of perguntas.entries()) {
      if (!q.texto.trim()) continue;
      const ops = q.opcoes.split(',').map((o) => o.trim()).filter(Boolean);
      if (q.tipo === 'escolha' && (ops.length < 2 || ops.length > 6)) return setErro(`Pergunta ${i + 1}: coloque de 2 a 6 opções, separadas por vírgula.`);
      if (/\[[A-Z0-9 ]+\]/.test(q.texto + q.opcoes)) return setErro(`Pergunta ${i + 1}: troque o texto entre colchetes pelo nome certo.`);
      montadas.push({ id: `p${i + 1}`, texto: q.texto.trim(), tipo: q.tipo, ...(q.tipo === 'escolha' ? { opcoes: ops } : {}) });
    }
    setCriando(true);
    if (nova.cor.trim() && !/^#[0-9a-f]{6}$/i.test(nova.cor.trim())) { setCriando(false); return setErro('A cor da marca vai no formato #RRGGBB, ex.: #F2C94C.'); }
    const visual: Record<string, string> = {};
    if (nova.chamada.trim()) visual.chamada = nova.chamada.trim();
    if (nova.cor.trim()) visual.cor = nova.cor.trim();
    if (nova.logo.trim()) visual.logo_url = nova.logo.trim();
    if (nova.moldura.trim()) visual.moldura_url = nova.moldura.trim();
    if (nova.molduraTexto.trim()) visual.moldura_texto = nova.molduraTexto.trim().slice(0, 60);
    const brindeOps = nova.brindeOpcoes.split(',').map((o) => o.trim()).filter(Boolean);
    if (brindeOps.length === 1 || brindeOps.length > 12) { setCriando(false); return setErro('Opções do brinde: de 2 a 12, separadas por vírgula (ou deixe em branco).'); }
    const { data, error } = await supabase.from('acoes_marca').insert({
      ...visual,
      marca: nova.marca.trim(), nome: nova.nome.trim(), inicio: nova.inicio, fim: nova.fim,
      investimento: nova.investimento ? Number(nova.investimento.replace(/\./g, '').replace(',', '.')) : null,
      objetivo: nova.objetivo.trim() || null,
      ...(montadas.length ? { pesquisa_perguntas: montadas } : {}),
      participacao: nova.participacao,
      brinde: nova.brinde.trim().slice(0, 80) || null,
      limite_total: nova.limite.trim() ? Math.max(1, parseInt(nova.limite.replace(/\D/g, ''), 10) || 0) || null : null,
      regra: nova.regra.trim().slice(0, 120) || null,
      ...(brindeOps.length ? { brinde_opcoes: brindeOps, brinde_pergunta: nova.brindePergunta.trim() || 'Qual você quer?' } : {}),
    }).select('*').single();
    setCriando(false);
    if (error) return setErro(error.message);
    setNova(VAZIA);
    setPerguntas([]);
    await carregar();
    setSel(data as Acao);
  }

  async function vincular(tabela: 'cupons' | 'eventos' | 'banners_app', id: string, ligar: boolean) {
    if (!sel) return;
    const { error } = await supabase.from(tabela).update({ acao_marca_id: ligar ? sel.id : null }).eq('id', id);
    if (error) return setErro(error.message);
    await carregarItens();
  }

  async function gerar() {
    if (!sel) return;
    setGerando(true); setErro('');
    const [{ data, error }, fotos] = await Promise.all([
      supabase.rpc('relatorio_acao_marca', { p_acao: sel.id }),
      supabase.rpc('fotos_da_acao', { p_acao: sel.id }),
    ]);
    const qz = await supabase.rpc('questionario_da_acao', { p_acao: sel.id });
    const ec = await supabase.rpc('escolhas_da_acao', { p_acao: sel.id });
    setGerando(false);
    if (error) return setErro(error.message);
    const fm = await supabase.from('memorias').select('id, caminho, marca_pode_publicar, enviado_marca_em, created_at')
      .eq('acao_id', sel.id).eq('enviar_para_marca', true).gt('expira_em', new Date().toISOString()).order('created_at', { ascending: false }).limit(200);
    const linhasFm = (fm.data || []) as { id: string; caminho: string; marca_pode_publicar: boolean; enviado_marca_em: string | null; created_at: string }[];
    if (linhasFm.length) {
      const caminhos = linhasFm.map((m) => m.caminho);
      const [ver, baixar] = await Promise.all([
        supabase.storage.from('memorias').createSignedUrls(caminhos, 3600),
        supabase.storage.from('memorias').createSignedUrls(caminhos, 3600, { download: true }),
      ]);
      const mv = new Map((ver.data || []).map((d) => [d.path, d.signedUrl]));
      const mb = new Map((baixar.data || []).map((d) => [d.path, d.signedUrl]));
      setFotosMarca(linhasFm.map((m) => ({ id: m.id, url: mv.get(m.caminho) || null, baixar: mb.get(m.caminho) || null, pode: m.marca_pode_publicar, quando: m.enviado_marca_em || m.created_at })));
    } else setFotosMarca([]);
    setRel({ ...(data as Rel), fotos: fotos.error ? null : (fotos.data as Rel['fotos']), questionario: qz.error ? null : (qz.data as ResQ | null), escolhas: ec.error ? null : (ec.data as Escolhas | null) });
  }

  function baixarPdf() {
    if (!rel) return;
    const w = window.open('', '_blank');
    if (!w) return alert('O navegador bloqueou a janela. Libere pop-ups para este site.');
    const a = rel.acao;
    const linhas = (itens: { rotulo: string; n: Num | undefined }[]) =>
      itens.length ? `<table class="g">${itens.map((i) => `<tr><td>${esc(i.rotulo)}</td><td class="v">${esc(t(i.n))}</td></tr>`).join('')}</table>` : '<p class="nota">Ainda poucas respostas (grupos com menos de 10 pessoas não aparecem).</p>';
    const p = rel.perfil;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório — ${esc(a.marca)} · ${esc(a.nome)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;max-width:780px;margin:28px auto;color:#15131c;line-height:1.45;padding:0 16px}
.topo{border-bottom:3px solid #E1306C;padding-bottom:10px;margin-bottom:14px}.marca{font-weight:900;color:#E1306C;letter-spacing:.5px;font-size:12px}
h1{font-size:22px;margin:4px 0}h2{font-size:15px;margin:22px 0 6px;color:#3D3BEF}.sub{color:#555;font-size:13px}
.cards{display:flex;gap:10px;margin-top:12px}.card{flex:1;border:1px solid #ddd;border-radius:10px;padding:10px;text-align:center}.card b{display:block;font-size:22px}.card span{font-size:11px;color:#555}
table{width:100%;border-collapse:collapse}.g td{border:1px solid #ddd;padding:7px;font-size:13px}.g td.v{font-weight:bold;text-align:right;width:140px}
.nota{font-size:11px;color:#666;margin:2px 0 6px}.rodape{margin-top:26px;border-top:1px solid #ddd;padding-top:10px;font-size:10.5px;color:#666}
@media print{h2{break-after:avoid}table{break-inside:avoid}}</style></head><body>
<div class="topo"><div class="marca">DICAS LGBT+ · RELATÓRIO DE AÇÃO DE MARCA</div><h1>${esc(a.marca)} — ${esc(a.nome)}</h1>
<div class="sub">${br(a.inicio)} a ${br(a.fim)}${a.objetivo ? ` · ${esc(a.objetivo)}` : ''}</div></div>
<div class="cards"><div class="card"><b>${esc(t(rel.funil.pessoas_que_foram))}</b><span>pessoas que foram</span></div>
<div class="card"><b>${rel.custo_por_presenca != null ? esc(reais(rel.custo_por_presenca)) : '—'}</b><span>custo por presença</span></div>
<div class="card"><b>${esc(t(rel.aceitam_ofertas_de_marcas))}</b><span>aceitam ofertas de marcas</span></div></div>
<h2>Funil</h2>${linhas(FUNIL.map(([etapa, k, r]) => ({ rotulo: `${etapa} · ${r}`, n: rel.funil[k] })))}
${rel.fotos ? `<h2>Fotos com a moldura da marca</h2>${linhas([{ rotulo: 'Check-ins na ação', n: rel.fotos.checkins ?? 0 }, { rotulo: 'Fotos tiradas', n: rel.fotos.fotos }, { rotulo: 'Compartilhadas (Stories, WhatsApp…)', n: rel.fotos.compartilhadas }, { rotulo: 'Salvas no celular', n: rel.fotos.salvas }])}` : ''}
${rel.escolhas ? `<h2>${esc(rel.escolhas.pergunta)} (preferência na retirada do brinde)</h2>${linhas(rel.escolhas.opcoes.map((o) => ({ rotulo: o.valor, n: o.n })))}` : ''}
${rel.questionario ? `<h2>Questionário de quem foi</h2><p class="nota">Responderam: ${esc(t(rel.questionario.responderam))}</p>${rel.questionario.perguntas.map((q) => `<h2 style="font-size:13px;color:#15131c">${esc(q.texto)}</h2>` + (q.tipo === 'escolha' ? linhas((q.opcoes || []).map((o) => ({ rotulo: o.valor, n: o.n }))) : q.tipo === 'nota' ? `<p class="nota">Média: ${q.media ?? '— (menos de 10 respostas)'}${q.promotores != null ? ` · ${q.promotores}% deram 9 ou 10 · ${q.detratores}% deram 0 a 6` : ''}</p>` : `<p class="nota">${esc(t(q.responderam))} comentários (lidos pela equipe Dicas; resumo à parte).</p>`)).join('')}` : ''}
${rel.pesquisa ? `<h2>Pesquisa: ${esc(rel.pesquisa.pergunta)}</h2><p class="nota">Responderam: ${esc(t(rel.pesquisa.responderam))}</p>${linhas(rel.pesquisa.respostas.map((r) => ({ rotulo: r.valor, n: r.n })))}` : ''}
${p.status === 'ok' ? `<h2>Idade de quem foi</h2>${linhas(IDADES.map((k) => ({ rotulo: k, n: p.idade?.[k] })))}
<h2>Dia da semana</h2>${linhas((p.chegada_dia || []).map((d) => ({ rotulo: DIAS[d.dia], n: d.n })))}
<h2>Identidade de gênero</h2><p class="nota">Só de quem autorizou (${esc(t(p.genero?.consentiram))}).</p>${linhas((p.genero?.grupos || []).map((g) => ({ rotulo: g.valor, n: g.n })))}
<h2>Orientação sexual</h2><p class="nota">Só de quem autorizou (${esc(t(p.orientacao?.consentiram))}).</p>${linhas((p.orientacao?.grupos || []).map((g) => ({ rotulo: g.valor, n: g.n })))}`
      : '<h2>Perfil de quem foi</h2><p class="nota">Menos de 30 pessoas: o perfil não é mostrado para proteger quem participou.</p>'}
<div class="rodape">Presença comprovada = cupom da ação usado no bar (com check-in) ou entrada pela Lista VIP lida na porta. Números somados e anônimos: grupos com menos de 10 pessoas aparecem como "menos de 10" e os demais são arredondados de 5 em 5. Identidade de gênero e orientação só de quem autorizou, de forma separada. Gerado em ${new Date(rel.gerado_em).toLocaleString('pt-BR')}.</div>
<script>setTimeout(function(){window.print()},400)</script></body></html>`);
    w.document.close();
  }

  const campo = 'bg-[#12121A] border border-[#232230] rounded-lg px-3 py-2 text-sm w-full';

  function Vinculos({ titulo, tabela, itens }: { titulo: string; tabela: 'cupons' | 'eventos' | 'banners_app'; itens: Item[] }) {
    const dentro = itens.filter((i) => sel && i.acao_marca_id === sel.id);
    const fora = itens.filter((i) => !i.acao_marca_id);
    return (
      <div className="bg-[#12121A] rounded-xl p-3">
        <h4 className="text-sm font-bold mb-2">{titulo} <span className="text-[#626274] font-normal">({dentro.length})</span></h4>
        {dentro.map((i) => (
          <div key={i.id} className="flex items-center gap-2 text-xs py-1">
            <span className="flex-1 truncate">{i.titulo}{i.extra ? <span className="text-[#626274]"> · {i.extra}</span> : null}</span>
            <button onClick={() => vincular(tabela, i.id, false)} className="text-[#A0A0B2] hover:text-[#E1306C]" title="Tirar da ação"><X size={14} /></button>
          </div>
        ))}
        <select className={`${campo} mt-2 text-xs`} value="" onChange={(e) => e.target.value && vincular(tabela, e.target.value, true)}>
          <option value="">+ Adicionar à ação…</option>
          {fora.map((i) => <option key={i.id} value={i.id}>{i.titulo}{i.extra ? ` · ${i.extra}` : ''}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {erroTabela && <p className="text-sm text-[#F2C94C]">{erroTabela}</p>}
      {erro && <p className="text-sm text-[#FF6B6B]">{erro}</p>}

      <section className="bg-[#161520] border border-[#232230] rounded-2xl p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Plus size={16} /> Nova ação</h3>
        <div className="grid grid-cols-2 gap-3">
          <input className={campo} placeholder="Marca (ex.: Skol)" value={nova.marca} onChange={(e) => setNova({ ...nova, marca: e.target.value })} />
          <input className={campo} placeholder="Nome da ação (ex.: Happy hour de novembro)" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
          <label className="text-xs text-[#A0A0B2]">Início<input type="date" className={campo} value={nova.inicio} onChange={(e) => setNova({ ...nova, inicio: e.target.value })} /></label>
          <label className="text-xs text-[#A0A0B2]">Fim<input type="date" className={campo} value={nova.fim} onChange={(e) => setNova({ ...nova, fim: e.target.value })} /></label>
          <input className={campo} placeholder="Investimento da marca em R$ (opcional)" value={nova.investimento} onChange={(e) => setNova({ ...nova, investimento: e.target.value })} />
          <input className={campo} placeholder="Objetivo (opcional)" value={nova.objetivo} onChange={(e) => setNova({ ...nova, objetivo: e.target.value })} />
          <input className={`${campo} col-span-2`} placeholder="Chamada no app (ex.: Happy hour com Skol gelada nos bares parceiros)" value={nova.chamada} onChange={(e) => setNova({ ...nova, chamada: e.target.value })} />
          <input className={campo} placeholder="Cor da marca (#F2C94C)" value={nova.cor} onChange={(e) => setNova({ ...nova, cor: e.target.value })} />
          <input className={campo} placeholder="Link do logo (opcional)" value={nova.logo} onChange={(e) => setNova({ ...nova, logo: e.target.value })} />
          <input className={`${campo} col-span-2`} placeholder="O que a pessoa ganha (ex.: Sorvete Kibon)" value={nova.brinde} onChange={(e) => setNova({ ...nova, brinde: e.target.value })} />
          <input className={campo} inputMode="numeric" placeholder="Para os primeiros (ex.: 100) — opcional" value={nova.limite} onChange={(e) => setNova({ ...nova, limite: e.target.value.replace(/\D/g, '') })} />
          <input className={campo} placeholder="Regra (ex.: Das 18h às 21h) — opcional" value={nova.regra} onChange={(e) => setNova({ ...nova, regra: e.target.value })} />
          <label className="text-xs text-[#A0A0B2] col-span-2">Como o público participa
            <select className={campo} value={nova.participacao} onChange={(e) => setNova({ ...nova, participacao: e.target.value })}>
              <option value="ambos">Check-in ou foto com a moldura (a pessoa escolhe)</option>
              <option value="checkin">Só check-in</option>
              <option value="foto">Só foto com a moldura</option>
            </select>
          </label>
          <input className={campo} placeholder="Moldura da marca: link de PNG transparente (opcional)" value={nova.moldura} onChange={(e) => setNova({ ...nova, moldura: e.target.value })} />
          <input className={campo} maxLength={60} placeholder="Ou frase da moldura, na cor da marca (até 60)" value={nova.molduraTexto} onChange={(e) => setNova({ ...nova, molduraTexto: e.target.value })} />
          <input className={campo} placeholder="Opções do brinde (ex.: Morango, Chocolate, Limão)" value={nova.brindeOpcoes} onChange={(e) => setNova({ ...nova, brindeOpcoes: e.target.value })} />
          <input className={campo} placeholder="Pergunta da escolha (ex.: Qual sabor você quer?)" value={nova.brindePergunta} onChange={(e) => setNova({ ...nova, brindePergunta: e.target.value })} />
          <div className="col-span-2 border border-[#232230] rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <b className="text-sm">Questionário para quem foi (até 5 perguntas, opcional)</b>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPerguntas(MODELO_LANCAMENTO)} className="text-xs border border-[#232230] rounded-lg px-2 py-1 hover:border-[#E1306C]">Modelo: lançamento de produto</button>
                <button type="button" onClick={() => setPerguntas(MODELO_LEMBRANCA)} className="text-xs border border-[#232230] rounded-lg px-2 py-1 hover:border-[#E1306C]">Modelo: lembrança de marca</button>
              </div>
            </div>
            {perguntas.map((q, i) => (
              <div key={i} className="grid grid-cols-[1fr_130px_32px] gap-2 items-start">
                <input className={campo} placeholder={`Pergunta ${i + 1}`} value={q.texto} onChange={(e) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)))} />
                <select className={campo} value={q.tipo} onChange={(e) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, tipo: e.target.value as PerguntaForm['tipo'] } : x)))}>
                  <option value="escolha">Opções</option><option value="nota">Nota 0 a 10</option><option value="aberta">Texto livre</option>
                </select>
                <button type="button" onClick={() => setPerguntas(perguntas.filter((_, k) => k !== i))} className="text-[#A0A0B2] hover:text-[#E1306C] pt-2" title="Tirar"><X size={16} /></button>
                {q.tipo === 'escolha' && (
                  <input className={`${campo} col-span-2`} placeholder="Opções separadas por vírgula" value={q.opcoes} onChange={(e) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, opcoes: e.target.value } : x)))} />
                )}
              </div>
            ))}
            {perguntas.length < 5 && (
              <button type="button" onClick={() => setPerguntas([...perguntas, { texto: '', tipo: 'escolha', opcoes: '' }])} className="self-start text-xs font-bold text-[#E1306C]">+ Adicionar pergunta</button>
            )}
            <p className="text-[11px] text-[#626274]">Só responde quem foi (presença comprovada), uma vez, até 14 dias depois. Resultado somado; textos livres só a equipe Dicas vê.</p>
          </div>
        </div>
        <button onClick={criar} disabled={criando} className="mt-3 bg-[#E1306C] text-white font-bold text-sm rounded-lg px-4 py-2 disabled:opacity-50">
          {criando ? 'Criando…' : 'Criar ação'}
        </button>
      </section>

      <section>
        <h3 className="font-bold mb-2">Ações</h3>
        {acoes === null ? <Loader2 className="animate-spin" size={18} /> : acoes.length === 0 ? (
          <p className="text-sm text-[#A0A0B2]">Nenhuma ação ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {acoes.map((a) => (
              <button key={a.id} onClick={() => setSel(a)} className={`text-left bg-[#161520] border rounded-xl px-4 py-3 ${sel?.id === a.id ? 'border-[#E1306C]' : 'border-[#232230] hover:border-[#3A3950]'}`}>
                <b>{a.marca}</b> · {a.nome}
                <span className="block text-xs text-[#A0A0B2]">{br(a.inicio)} a {br(a.fim)}{a.investimento != null ? ` · ${reais(a.investimento)}` : ''}{a.pesquisa_pergunta || (a as any).pesquisa_perguntas ? ' · com questionário' : ''}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {sel && (
        <section className="bg-[#161520] border border-[#232230] rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold flex items-center gap-2"><Link2 size={16} /> {sel.marca} · {sel.nome}</h3>
            <button onClick={gerar} disabled={gerando} className="bg-[#E1306C] text-white font-bold text-xs rounded-lg px-3 py-2 disabled:opacity-50">
              {gerando ? 'Gerando…' : 'Gerar relatório'}
            </button>
          </div>
          <p className="text-xs text-[#A0A0B2]">Etiquete o que faz parte da ação. Tudo o que acontecer neles no período conta para a marca. No app, a ação aparece em "Ações da semana" (Home e Eventos, só depois que a equipe Dicas liga "Mostrar no app"), com o selo "Apoio · {sel.marca}" nos cupons e festas, e tem uma página própria: <code>/marca/{sel.id}</code> (use como destino de um banner).</p>
          {sel.mostrar_no_app !== undefined && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!sel.mostrar_no_app} onChange={async (e) => {
                const v = e.target.checked;
                const { error } = await supabase.from('acoes_marca').update({ mostrar_no_app: v }).eq('id', sel.id);
                if (error) return setErro(error.message);
                setSel({ ...sel, mostrar_no_app: v }); void carregar();
              }} />
              Mostrar no app (faixa, selo e página)
            </label>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Vinculos titulo="Cupons" tabela="cupons" itens={cupons} />
            <Vinculos titulo="Festas" tabela="eventos" itens={festas} />
            <Vinculos titulo="Banners" tabela="banners_app" itens={banners} />
          </div>

          {rel && (
            <div className="flex flex-col gap-4 border-t border-[#232230] pt-4">
              <div className="flex justify-end">
                <button onClick={baixarPdf} className="flex items-center gap-2 text-xs font-bold border border-[#232230] rounded-lg px-3 py-2 hover:border-[#E1306C]"><FileDown size={14} /> Baixar PDF para a marca</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[['pessoas que foram', t(rel.funil.pessoas_que_foram)], ['custo por presença', rel.custo_por_presenca != null ? reais(rel.custo_por_presenca) : '—'], ['aceitam ofertas de marcas', t(rel.aceitam_ofertas_de_marcas)]].map(([r, v]) => (
                  <div key={r} className="bg-[#12121A] rounded-xl p-3 text-center"><b className="text-xl block">{v}</b><span className="text-[11px] text-[#A0A0B2]">{r}</span></div>
                ))}
              </div>
              <div><h4 className="text-sm font-bold mb-2">Funil</h4><Barras itens={FUNIL.map(([etapa, k, r]) => ({ rotulo: `${etapa} · ${r}`, n: rel.funil[k] }))} /></div>
              {rel.fotos && (
                <div><h4 className="text-sm font-bold mb-2">Fotos com a moldura da marca</h4><Barras itens={[{ rotulo: 'Check-ins na ação', n: rel.fotos.checkins ?? 0 }, { rotulo: 'Fotos tiradas', n: rel.fotos.fotos }, { rotulo: 'Compartilhadas', n: rel.fotos.compartilhadas }, { rotulo: 'Salvas no celular', n: rel.fotos.salvas }]} /></div>
              )}
              {fotosMarca.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-1">Fotos enviadas para a marca <span className="text-[11px] text-[#626274] font-normal">({fotosMarca.length} · {fotosMarca.filter((f) => f.pode).length} podem ser postadas)</span></h4>
                  <p className="text-[11px] text-[#A0A0B2] mb-2">Entregue à marca só as que ela pode usar. "Só para a marca ver" não pode ser postada. Se a pessoa retirar a autorização, a foto some daqui e a marca precisa apagar o post.</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {fotosMarca.map((f) => (
                      <a key={f.id} href={f.baixar || f.url || '#'} target="_blank" rel="noreferrer" className="block relative rounded-lg overflow-hidden border border-[#232230]">
                        {f.url && <img src={f.url} alt="Foto enviada para a marca" className="w-full aspect-[4/5] object-cover" />}
                        <span className={`absolute left-1 bottom-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${f.pode ? 'bg-[#34D399] text-[#0B0B0E]' : 'bg-black/70 text-white'}`}>{f.pode ? 'Pode postar' : 'Só para a marca ver'}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {rel.escolhas && (
                <div><h4 className="text-sm font-bold mb-2">{rel.escolhas.pergunta} <span className="text-[11px] text-[#626274] font-normal">(escolhas na retirada: {t(rel.escolhas.total)})</span></h4><Barras itens={rel.escolhas.opcoes.map((o) => ({ rotulo: o.valor, n: o.n }))} /></div>
              )}
              {rel.questionario && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold">Questionário de quem foi <span className="text-[11px] text-[#626274] font-normal">(responderam: {t(rel.questionario.responderam)})</span></h4>
                  {rel.questionario.perguntas.map((q) => (
                    <div key={q.id} className="bg-[#12121A] rounded-xl p-3">
                      <div className="text-xs font-bold mb-2">{q.texto}</div>
                      {q.tipo === 'escolha' && <Barras itens={(q.opcoes || []).map((o) => ({ rotulo: o.valor, n: o.n }))} />}
                      {q.tipo === 'nota' && <p className="text-xs text-[#A0A0B2]">Média: <b className="text-white">{q.media ?? '—'}</b>{q.promotores != null ? ` · ${q.promotores}% deram 9 ou 10 · ${q.detratores}% deram 0 a 6` : ' (aparece com 10 respostas ou mais)'}</p>}
                      {q.tipo === 'aberta' && (q.textos?.length ? <ul className="text-xs text-[#D0D0E0] list-disc pl-4 space-y-1 max-h-48 overflow-auto">{q.textos.map((tx, k) => <li key={k}>{tx}</li>)}</ul> : <p className="text-xs text-[#626274]">Sem comentários ainda.</p>)}
                    </div>
                  ))}
                </div>
              )}
              {rel.pesquisa && (
                <div><h4 className="text-sm font-bold mb-2">Pesquisa: {rel.pesquisa.pergunta} <span className="text-[11px] text-[#626274] font-normal">(responderam: {t(rel.pesquisa.responderam)})</span></h4>
                  <Barras itens={rel.pesquisa.respostas.map((r) => ({ rotulo: r.valor, n: r.n }))} /></div>
              )}
              {rel.perfil.status === 'ok' ? (
                <>
                  <div><h4 className="text-sm font-bold mb-2">Idade de quem foi</h4><Barras itens={IDADES.map((k) => ({ rotulo: k, n: rel.perfil.idade?.[k] }))} /></div>
                  <div><h4 className="text-sm font-bold mb-2">Dia da semana</h4><Barras itens={(rel.perfil.chegada_dia || []).map((d) => ({ rotulo: DIAS[d.dia], n: d.n }))} /></div>
                  <div><h4 className="text-sm font-bold mb-2">Identidade de gênero <span className="text-[11px] text-[#626274] font-normal">(só quem autorizou: {t(rel.perfil.genero?.consentiram)})</span></h4><Barras itens={(rel.perfil.genero?.grupos || []).map((g) => ({ rotulo: g.valor, n: g.n }))} /></div>
                  <div><h4 className="text-sm font-bold mb-2">Orientação sexual <span className="text-[11px] text-[#626274] font-normal">(só quem autorizou: {t(rel.perfil.orientacao?.consentiram)})</span></h4><Barras itens={(rel.perfil.orientacao?.grupos || []).map((g) => ({ rotulo: g.valor, n: g.n }))} /></div>
                </>
              ) : (
                <p className="text-xs text-[#A0A0B2]">Perfil de quem foi: aparece a partir de 30 pessoas, para proteger quem participou.</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
