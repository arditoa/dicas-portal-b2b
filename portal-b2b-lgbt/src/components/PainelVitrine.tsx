'use client';
// Aba "Vitrine das categorias" do /admin (out/2026) — o gancho de venda:
//  1) Banner fixo (patrocínio) de cada categoria: texto, botão, imagem, cores, período e patrocinador.
//  2) Comunicação dos Membros Fundadores: a equipe escreve a frase que gera desejo + a oferta do dia;
//     o fundador vê e ajusta no portal dele.
//  3) Limite de ofertas por mês de cada plano.
//  4) Desempenho: exibições e toques por seção nos últimos 30 dias.
// Tabelas: categoria_patrocinio, fundador_comunicacao, planos_limite_ofertas, vitrine_eventos (migration 059).
import { Check, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { erroFotoNaoSuportada } from '../lib/validarFoto';

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const card = 'bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-6';
const botao = 'bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2';

const CATEGORIAS = [
  ['destaques', 'Destaques'], ['turismo', 'Turismo | Dicas Trip'], ['bares', 'Bares & Vida Noturna'], ['gastronomia', 'Gastronomia'],
  ['cultura', 'Cultura'], ['servicos', 'Serviços'], ['educacao', 'Educação'], ['produtos', 'Produtos'], ['lazer', 'Lazer'],
  ['saude', 'Saúde'], ['beleza', 'Beleza'], ['comunidade', 'Comunidade'], ['mais18', '18+'], ['todos', 'Todos os locais'],
] as const;
const PLANOS = ['freemium', 'starter', 'intermediario', 'premium', 'fundador'] as const;

type Patrocinio = {
  id?: string;
  categoria: string;
  local_id: string | null;
  tag: string;
  titulo: string;
  subtitulo: string;
  cta: string;
  destino: string;
  imagem_url: string;
  cor1: string;
  cor2: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};
const VAZIO: Patrocinio = { categoria: 'bares', local_id: null, tag: 'PATROCINADOR DA CATEGORIA', titulo: '', subtitulo: '', cta: 'Saiba mais', destino: '', imagem_url: '', cor1: '#7E57C2', cor2: '#E1306C', ativo: true, inicio: '', fim: '' };

type Fundador = { id: string; nome: string; plano_comercial: string | null };
type Comunicacao = { local_id: string; headline: string; texto: string; oferta: string; cta: string; destino: string; imagem_url: string; ativo: boolean; escrito_por?: string; updated_at?: string };
const COM_VAZIA = (id: string): Comunicacao => ({ local_id: id, headline: '', texto: '', oferta: '', cta: 'Conhecer', destino: '', imagem_url: '', ativo: true });

const dataLocal = (iso?: string | null) => (iso ? iso.slice(0, 16) : '');

export default function PainelVitrine() {
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  // ---- 1) Patrocínio por categoria
  const [patrocinios, setPatrocinios] = useState<Patrocinio[]>([]);
  const [edit, setEdit] = useState<Patrocinio | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [buscaLocal, setBuscaLocal] = useState('');
  const [achados, setAchados] = useState<{ id: string; nome: string }[]>([]);
  const [nomePatrocinador, setNomePatrocinador] = useState('');

  const carregarPatrocinios = useCallback(async () => {
    const { data, error } = await supabase.from('categoria_patrocinio').select('*').order('categoria');
    if (error) { setErro(`Rode a migration 059 no Supabase (${error.message}).`); return; }
    setPatrocinios((data || []).map((r: any) => ({ ...VAZIO, ...r, subtitulo: r.subtitulo || '', imagem_url: r.imagem_url || '', inicio: dataLocal(r.inicio), fim: dataLocal(r.fim) })));
  }, []);

  // ---- 2) Fundadores
  const [fundadores, setFundadores] = useState<Fundador[]>([]);
  const [coms, setComs] = useState<Record<string, Comunicacao>>({});
  const [fundAberto, setFundAberto] = useState<string | null>(null);
  const [ofTitulo, setOfTitulo] = useState('');
  const [ofAte, setOfAte] = useState('');

  const carregarFundadores = useCallback(async () => {
    const { data } = await supabase
      .from('local_badges')
      .select('local_id, locais!inner(id, nome, plano_comercial, status)')
      .ilike('rotulo', '%fundador%')
      .eq('ativo', true)
      .eq('locais.status', 'aprovado');
    const mapa = new Map<string, Fundador>();
    for (const r of (data as any[]) || []) mapa.set(r.locais.id, { id: r.locais.id, nome: r.locais.nome, plano_comercial: r.locais.plano_comercial });
    const lista = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    setFundadores(lista);
    if (lista.length) {
      const { data: cs } = await supabase.from('fundador_comunicacao').select('*').in('local_id', lista.map((f) => f.id));
      const m: Record<string, Comunicacao> = {};
      for (const c of (cs as any[]) || []) m[c.local_id] = { ...COM_VAZIA(c.local_id), ...c, headline: c.headline || '', texto: c.texto || '', oferta: c.oferta || '', imagem_url: c.imagem_url || '' };
      setComs(m);
    }
  }, []);

  // ---- 1b) Chamadas dos banners de destaque (migration 060): o banner mostra a chamada, não o nome do local
  type Chamada = { local_id: string; nome: string; chamada: string; cta: string; imagem_url: string; ativo: boolean; escrito_por?: string };
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [chEdit, setChEdit] = useState<Chamada | null>(null);
  const [buscaCh, setBuscaCh] = useState('');
  const [achadosCh, setAchadosCh] = useState<{ id: string; nome: string }[]>([]);
  const carregarChamadas = useCallback(async () => {
    const { data, error } = await supabase.from('destaque_chamada').select('local_id, chamada, cta, imagem_url, ativo, escrito_por, locais(nome)').order('updated_at', { ascending: false });
    if (error) return; // migration 060 ainda não rodou
    setChamadas(((data as any[]) || []).map((r) => ({ local_id: r.local_id, nome: r.locais?.nome || '', chamada: r.chamada, cta: r.cta, imagem_url: r.imagem_url || '', ativo: r.ativo, escrito_por: r.escrito_por })));
  }, []);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (buscaCh.trim().length < 2) { setAchadosCh([]); return; }
      const { data } = await supabase.from('locais').select('id, nome').eq('status', 'aprovado').ilike('nome', `%${buscaCh.trim()}%`).limit(6);
      setAchadosCh((data as any[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [buscaCh]);
  const salvarChamada = async () => {
    if (!chEdit) return;
    if (!chEdit.chamada.trim()) { setErro('Escreva a chamada.'); return; }
    const { error } = await supabase.from('destaque_chamada').upsert({
      local_id: chEdit.local_id, chamada: chEdit.chamada.trim(), cta: chEdit.cta.trim() || 'Conhecer',
      imagem_url: chEdit.imagem_url.trim() || null, ativo: chEdit.ativo, escrito_por: 'equipe',
    });
    if (error) { setErro(error.message.includes('destaque_chamada') ? 'Rode a migration 060 no Supabase.' : error.message); setAviso(''); return; }
    setChEdit(null); setErro(''); setAviso('Chamada salva — o banner de destaque já usa esse texto.');
    carregarChamadas();
  };
  const apagarChamada = async (id: string) => {
    if (!confirm('Remover esta chamada? O banner volta ao convite padrão.')) return;
    await supabase.from('destaque_chamada').delete().eq('local_id', id);
    carregarChamadas();
  };

  // ---- 2b) Ofertas da equipe em qualquer local (carrossel lateral de ofertas das categorias)
  type OfertaEq = { id: string; titulo: string; ativo: boolean; valido_ate: string | null; nome: string };
  const [ofertasEq, setOfertasEq] = useState<OfertaEq[]>([]);
  const [oeTitulo, setOeTitulo] = useState('');
  const [oeAte, setOeAte] = useState('');
  const [oeBusca, setOeBusca] = useState('');
  const [oeAchados, setOeAchados] = useState<{ id: string; nome: string }[]>([]);
  const [oeLocal, setOeLocal] = useState<{ id: string; nome: string } | null>(null);
  const carregarOfertasEq = useCallback(async () => {
    const { data, error } = await supabase.from('cupons').select('id, titulo, ativo, valido_ate, locais(nome)').eq('criado_pela_equipe', true).order('created_at', { ascending: false }).limit(60);
    if (error) return;
    setOfertasEq(((data as any[]) || []).map((r) => ({ id: r.id, titulo: r.titulo, ativo: r.ativo, valido_ate: r.valido_ate, nome: r.locais?.nome || '' })));
  }, []);
  useEffect(() => { carregarOfertasEq(); }, [carregarOfertasEq]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (oeBusca.trim().length < 2) { setOeAchados([]); return; }
      const { data } = await supabase.from('locais').select('id, nome').eq('status', 'aprovado').ilike('nome', `%${oeBusca.trim()}%`).limit(6);
      setOeAchados((data as any[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [oeBusca]);
  const criarOfertaLivre = async () => {
    if (!oeLocal) { setErro('Escolha o local da oferta.'); return; }
    if (!oeTitulo.trim()) { setErro('Escreva o texto da oferta.'); return; }
    const { error } = await supabase.from('cupons').insert({ local_id: oeLocal.id, titulo: oeTitulo.trim(), valido_ate: oeAte ? new Date(oeAte).toISOString() : null, criado_pela_equipe: true });
    if (error) { setErro(error.message); setAviso(''); return; }
    setOeTitulo(''); setOeAte(''); setErro(''); setAviso('Oferta criada — entra no carrossel de ofertas das categorias.');
    carregarOfertasEq();
  };
  const alternarOferta = async (o: OfertaEq) => {
    await supabase.from('cupons').update({ ativo: !o.ativo }).eq('id', o.id);
    carregarOfertasEq();
  };
  const apagarOferta = async (id: string) => {
    if (!confirm('Apagar esta oferta?')) return;
    await supabase.from('cupons').delete().eq('id', id);
    carregarOfertasEq();
  };

  // ---- 3) Limites
  const [limites, setLimites] = useState<Record<string, string>>({});
  const carregarLimites = useCallback(async () => {
    const { data } = await supabase.from('planos_limite_ofertas').select('plano, limite_mes');
    const m: Record<string, string> = {};
    for (const r of (data as any[]) || []) m[r.plano] = r.limite_mes == null ? '' : String(r.limite_mes);
    setLimites(m);
  }, []);

  // ---- 4) Desempenho
  const [desempenho, setDesempenho] = useState<{ secao: string; exib: number; cliq: number }[]>([]);
  const carregarDesempenho = useCallback(async () => {
    const desde = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await supabase.from('vitrine_eventos').select('secao, tipo').gte('created_at', desde).limit(20000);
    const m = new Map<string, { exib: number; cliq: number }>();
    for (const r of (data as any[]) || []) {
      const x = m.get(r.secao) || { exib: 0, cliq: 0 };
      if (r.tipo === 'clique') x.cliq++; else x.exib++;
      m.set(r.secao, x);
    }
    setDesempenho(Array.from(m.entries()).map(([secao, v]) => ({ secao, ...v })).sort((a, b) => b.exib - a.exib));
  }, []);

  useEffect(() => {
    carregarPatrocinios(); carregarFundadores(); carregarLimites(); carregarDesempenho(); carregarChamadas();
  }, [carregarPatrocinios, carregarFundadores, carregarLimites, carregarDesempenho, carregarChamadas]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (buscaLocal.trim().length < 2) { setAchados([]); return; }
      const { data } = await supabase.from('locais').select('id, nome').eq('status', 'aprovado').ilike('nome', `%${buscaLocal.trim()}%`).limit(6);
      setAchados((data as any[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [buscaLocal]);

  const dica = (m: string) => { setAviso(m); setErro(''); };
  const falha = (m: string) => { setErro(m); setAviso(''); };

  const salvarPatrocinio = async () => {
    if (!edit) return;
    if (!edit.titulo.trim()) return falha('Escreva o título do banner.');
    setSalvando(true);
    const linha = {
      categoria: edit.categoria,
      local_id: edit.local_id,
      tag: edit.tag || 'PATROCINADOR DA CATEGORIA',
      titulo: edit.titulo.trim(),
      subtitulo: edit.subtitulo.trim() || null,
      cta: edit.cta.trim() || 'Saiba mais',
      destino: edit.destino.trim(),
      imagem_url: edit.imagem_url.trim() || null,
      cor1: edit.cor1, cor2: edit.cor2, ativo: edit.ativo,
      inicio: edit.inicio ? new Date(edit.inicio).toISOString() : null,
      fim: edit.fim ? new Date(edit.fim).toISOString() : null,
    };
    const { error } = await supabase.from('categoria_patrocinio').upsert(linha, { onConflict: 'categoria' });
    setSalvando(false);
    if (error) return falha(error.message);
    dica('Banner da categoria salvo — já aparece no app.');
    setEdit(null); setNomePatrocinador('');
    carregarPatrocinios();
  };

  const apagarPatrocinio = async (categoria: string) => {
    if (!confirm('Remover o banner desta categoria? O app volta a mostrar o convite "Sua marca em destaque".')) return;
    const { error } = await supabase.from('categoria_patrocinio').delete().eq('categoria', categoria);
    if (error) return falha(error.message);
    carregarPatrocinios();
  };

  const subirImagem = async (arquivo: File | undefined) => {
    if (!arquivo || !edit) return;
    const e = erroFotoNaoSuportada(arquivo);
    if (e) return falha(e);
    const caminho = `patrocinio/${edit.categoria}-${Date.now()}.${arquivo.name.split('.').pop() || 'jpg'}`;
    const { error } = await supabase.storage.from('fotos-destinos').upload(caminho, arquivo, { cacheControl: '3600' });
    if (error) return falha(`Não deu pra enviar: ${error.message}`);
    setEdit({ ...edit, imagem_url: supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl });
  };

  const salvarCom = async (c: Comunicacao) => {
    const { error } = await supabase.from('fundador_comunicacao').upsert({
      local_id: c.local_id,
      headline: c.headline.trim() || null,
      texto: c.texto.trim() || null,
      oferta: c.oferta.trim() || null,
      cta: c.cta.trim() || 'Conhecer',
      destino: c.destino.trim(),
      imagem_url: c.imagem_url.trim() || null,
      ativo: c.ativo,
      escrito_por: 'equipe',
    });
    if (error) return falha(error.message);
    dica('Comunicação salva — o fundador vê no portal dele e o app já usa.');
  };

  const criarOfertaEquipe = async (localId: string) => {
    if (!ofTitulo.trim()) return falha('Escreva o título da oferta.');
    const { error } = await supabase.from('cupons').insert({
      local_id: localId, titulo: ofTitulo.trim(), valido_ate: ofAte ? new Date(ofAte).toISOString() : null, criado_pela_equipe: true,
    });
    if (error) return falha(error.message);
    setOfTitulo(''); setOfAte('');
    dica('Oferta criada pela equipe — aparece em "Ofertas e benefícios" no app.');
  };

  const salvarLimites = async () => {
    for (const p of PLANOS) {
      const v = (limites[p] ?? '').trim();
      const { error } = await supabase.from('planos_limite_ofertas').upsert({ plano: p, limite_mes: v === '' ? null : Math.max(0, Number(v)), atualizado_em: new Date().toISOString() });
      if (error) return falha(error.message);
    }
    dica('Limites salvos.');
  };

  return (
    <div>
      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">{erro}</div>}
      {aviso && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs mb-4 flex items-center gap-2"><Check size={14} /> {aviso}</div>}

      {/* 1) PATROCÍNIO POR CATEGORIA */}
      <div className={card}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-black">Banner fixo de cada categoria (patrocínio)</h2>
          <button className={botao} onClick={() => setEdit({ ...VAZIO })}><Plus size={14} /> Novo banner</button>
        </div>
        <p className="text-[#A0A0B2] text-xs mb-4">Fica logo abaixo dos Destaques em toda página de categoria. Um por categoria. O patrocinador também pode ajustar texto, botão e cores pelo portal dele.</p>

        {patrocinios.length === 0 && <p className="text-xs text-[#626274]">Nenhum banner ainda — o app mostra o convite "Sua marca em destaque".</p>}
        <div className="space-y-2">
          {patrocinios.map((p) => (
            <div key={p.categoria} className="flex items-center gap-3 bg-[#0B0B0E] border border-[#232230] rounded-xl p-3">
              <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, ${p.cor1}, ${p.cor2})` }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{p.titulo}</p>
                <p className="text-[11px] text-[#8888A0]">{CATEGORIAS.find((c) => c[0] === p.categoria)?.[1] || p.categoria} · {p.ativo ? 'ativo' : 'pausado'}{p.fim ? ` · até ${p.fim.slice(0, 10)}` : ''}</p>
              </div>
              <button className="text-xs font-bold text-[#E1306C]" onClick={() => { setEdit(p); setNomePatrocinador(''); }}>Editar</button>
              <button className="text-[#626274] hover:text-red-400" onClick={() => apagarPatrocinio(p.categoria)} aria-label="Remover"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        {edit && (
          <div className="mt-5 border-t border-[#232230] pt-5 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Categoria</label>
                <select className={input} value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })}>
                  {CATEGORIAS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Patrocinador (local do app, opcional)</label>
                <input className={input} placeholder="Digite 2+ letras do nome" value={buscaLocal} onChange={(e) => setBuscaLocal(e.target.value)} />
                {achados.length > 0 && (
                  <div className="mt-1 bg-[#0B0B0E] border border-[#232230] rounded-xl overflow-hidden">
                    {achados.map((a) => (
                      <button key={a.id} className="block w-full text-left text-xs px-3 py-2 hover:bg-[#1D1C29]" onClick={() => { setEdit({ ...edit, local_id: a.id }); setNomePatrocinador(a.nome); setBuscaLocal(''); setAchados([]); }}>{a.nome}</button>
                    ))}
                  </div>
                )}
                {edit.local_id && <p className="text-[11px] text-emerald-400 mt-1">Vinculado: {nomePatrocinador || edit.local_id} <button className="underline ml-2 text-[#A0A0B2]" onClick={() => { setEdit({ ...edit, local_id: null }); setNomePatrocinador(''); }}>remover</button></p>}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className={label}>Etiqueta (pequena, no topo)</label><input className={input} value={edit.tag} maxLength={40} onChange={(e) => setEdit({ ...edit, tag: e.target.value })} /></div>
              <div><label className={label}>Texto do botão</label><input className={input} value={edit.cta} maxLength={24} onChange={(e) => setEdit({ ...edit, cta: e.target.value })} /></div>
            </div>
            <div><label className={label}>Título (a oferta ou a mensagem do patrocinador)</label><input className={input} value={edit.titulo} maxLength={90} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} placeholder="Ex.: Bares by Ambev" /></div>
            <div><label className={label}>Sobre o patrocinador (texto curto, até 200)</label><textarea className={input} rows={3} maxLength={200} value={edit.subtitulo} onChange={(e) => setEdit({ ...edit, subtitulo: e.target.value })} placeholder="Ex.: A Ambev é a maior cervejaria do Brasil, com marcas como Skol, Brahma e Antarctica…" /></div>
            <div><label className={label}>Para onde o botão leva</label><input className={input} value={edit.destino} onChange={(e) => setEdit({ ...edit, destino: e.target.value })} placeholder="local:<id do local>, /rota do app ou https://..." /></div>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className={label}>Cor 1</label><input type="color" className="w-full h-10 bg-transparent" value={edit.cor1} onChange={(e) => setEdit({ ...edit, cor1: e.target.value })} /></div>
              <div><label className={label}>Cor 2</label><input type="color" className="w-full h-10 bg-transparent" value={edit.cor2} onChange={(e) => setEdit({ ...edit, cor2: e.target.value })} /></div>
              <div>
                <label className={label}>Arte do banner (fundo, opcional)</label>
                <input type="file" accept="image/*" className="text-xs" onChange={(e) => subirImagem(e.target.files?.[0])} />
                {edit.imagem_url && <p className="text-[11px] text-emerald-400 mt-1">Imagem enviada</p>}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className={label}>Começa em</label><input type="datetime-local" className={input} value={edit.inicio} onChange={(e) => setEdit({ ...edit, inicio: e.target.value })} /></div>
              <div><label className={label}>Termina em</label><input type="datetime-local" className={input} value={edit.fim} onChange={(e) => setEdit({ ...edit, fim: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-xs mt-6"><input type="checkbox" checked={edit.ativo} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} /> Ativo</label>
            </div>
            <div className="flex gap-3">
              <button className={botao} disabled={salvando} onClick={salvarPatrocinio}>{salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar banner</button>
              <button className="text-xs text-[#A0A0B2]" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* 1b) CHAMADAS DOS BANNERS DE DESTAQUE */}
      <div className={card}>
        <h2 className="text-sm font-black mb-1">Chamadas dos banners rotativos</h2>
        <p className="text-[#A0A0B2] text-xs mb-4">O banner rotativo no topo das categorias <b>não mostra o nome do local</b>: mostra uma chamada que gera desejo, ex.: &ldquo;Conheça o nosso queridinho drink de Lichia&rdquo;. Ao tocar, abre a página do local. O próprio local também pode editar a chamada no portal; aqui a equipe escreve ou ajusta por ele.</p>
        <div className="mb-3">
          <label className={label}>Escolher o local</label>
          <input className={input} placeholder="Digite 2+ letras do nome" value={buscaCh} onChange={(e) => setBuscaCh(e.target.value)} />
          {achadosCh.length > 0 && (
            <div className="mt-1 bg-[#0B0B0E] border border-[#232230] rounded-xl overflow-hidden">
              {achadosCh.map((a) => {
                const ja = chamadas.find((c) => c.local_id === a.id);
                return (
                  <button key={a.id} className="block w-full text-left text-xs px-3 py-2 hover:bg-[#1D1C29]" onClick={() => { setChEdit(ja || { local_id: a.id, nome: a.nome, chamada: '', cta: 'Conhecer', imagem_url: '', ativo: true }); setBuscaCh(''); setAchadosCh([]); }}>{a.nome}{ja ? ' · já tem chamada' : ''}</button>
                );
              })}
            </div>
          )}
        </div>
        {chEdit && (
          <div className="border border-[#232230] rounded-xl p-4 mb-4 space-y-3">
            <p className="text-xs font-bold">{chEdit.nome}</p>
            <div><label className={label}>Chamada (até 90, sem o nome do local)</label><input className={input} maxLength={90} value={chEdit.chamada} onChange={(e) => setChEdit({ ...chEdit, chamada: e.target.value })} placeholder="Conheça o nosso queridinho drink de Lichia" /></div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className={label}>Texto do botão</label><input className={input} maxLength={24} value={chEdit.cta} onChange={(e) => setChEdit({ ...chEdit, cta: e.target.value })} /></div>
              <div className="text-[11px] text-[#8888A0] md:pt-6">O banner é em degradê, sem foto.</div>
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={chEdit.ativo} onChange={(e) => setChEdit({ ...chEdit, ativo: e.target.checked })} /> Ativa</label>
            <div className="flex gap-3"><button className={botao} onClick={salvarChamada}><Save size={14} /> Salvar chamada</button><button className="text-xs text-[#A0A0B2]" onClick={() => setChEdit(null)}>Cancelar</button></div>
          </div>
        )}
        <div className="space-y-2">
          {chamadas.length === 0 && <p className="text-xs text-[#626274]">Nenhuma chamada escrita ainda — os banners usam um convite neutro (&ldquo;Conheça um bar em [bairro]&rdquo;).</p>}
          {chamadas.map((c) => (
            <div key={c.local_id} className="flex items-center gap-3 bg-[#0B0B0E] border border-[#232230] rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{c.chamada}</p>
                <p className="text-[11px] text-[#8888A0]">{c.nome} · {c.ativo ? 'ativa' : 'pausada'} · escrita por {c.escrito_por === 'local' ? 'o local' : 'a equipe'}</p>
              </div>
              <button className="text-xs font-bold text-[#E1306C]" onClick={() => setChEdit(c)}>Editar</button>
              <button className="text-[#626274] hover:text-red-400" onClick={() => apagarChamada(c.local_id)} aria-label="Remover"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* 2) COMUNICAÇÃO DOS FUNDADORES */}
      <div className={card}>
        <h2 className="text-sm font-black mb-1">Comunicação dos Membros Fundadores</h2>
        <p className="text-[#A0A0B2] text-xs mb-4">É aqui que a equipe deixa o negócio do fundador o mais vendável possível: uma frase que gera desejo e a oferta do momento. Aparece no topo da Home, na categoria Destaques e nos cartões de destaque. O fundador vê o texto no portal e pode ajustar.</p>
        {fundadores.length === 0 && <p className="text-xs text-[#626274]">Nenhum Membro Fundador ativo ainda.</p>}
        <div className="space-y-2">
          {fundadores.map((f) => {
            const c = coms[f.id] || COM_VAZIA(f.id);
            const aberto = fundAberto === f.id;
            return (
              <div key={f.id} className="bg-[#0B0B0E] border border-[#232230] rounded-xl">
                <button className="w-full flex items-center gap-3 p-3 text-left" onClick={() => setFundAberto(aberto ? null : f.id)}>
                  <span className="flex-1 text-sm font-bold truncate">{f.nome}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${coms[f.id]?.headline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{coms[f.id]?.headline ? 'Comunicação pronta' : 'Falta escrever'}</span>
                </button>
                {aberto && (
                  <div className="p-4 pt-0 space-y-3">
                    <div><label className={label}>Frase que gera desejo (até 90)</label><input className={input} maxLength={90} value={c.headline} onChange={(e) => setComs({ ...coms, [f.id]: { ...c, headline: e.target.value } })} placeholder="Ex.: O rooftop onde a noite começa ao pôr do sol" /></div>
                    <div><label className={label}>Texto de apoio (até 280)</label><textarea className={input} rows={3} maxLength={280} value={c.texto} onChange={(e) => setComs({ ...coms, [f.id]: { ...c, texto: e.target.value } })} /></div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div><label className={label}>Oferta do momento (até 90)</label><input className={input} maxLength={90} value={c.oferta} onChange={(e) => setComs({ ...coms, [f.id]: { ...c, oferta: e.target.value } })} placeholder="Ex.: Chopp em dobro até 20h" /></div>
                      <div><label className={label}>Texto do botão</label><input className={input} maxLength={24} value={c.cta} onChange={(e) => setComs({ ...coms, [f.id]: { ...c, cta: e.target.value } })} /></div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div><label className={label}>Botão leva para (vazio = página do local)</label><input className={input} value={c.destino} onChange={(e) => setComs({ ...coms, [f.id]: { ...c, destino: e.target.value } })} placeholder="/rota, https://... ou local:<id>" /></div>
                      <div><label className={label}>Imagem do destaque (URL, opcional)</label><input className={input} value={c.imagem_url} onChange={(e) => setComs({ ...coms, [f.id]: { ...c, imagem_url: e.target.value } })} /></div>
                    </div>
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.ativo} onChange={(e) => setComs({ ...coms, [f.id]: { ...c, ativo: e.target.checked } })} /> Ativo no app</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button className={botao} onClick={() => salvarCom(c)}><Save size={14} /> Salvar comunicação</button>
                      {c.escrito_por === 'fundador' && <span className="text-[11px] text-amber-400">Última edição feita pelo fundador</span>}
                    </div>
                    <div className="border-t border-[#232230] pt-3">
                      <label className={label}>Criar oferta em nome da equipe (sem limite mensal)</label>
                      <div className="grid md:grid-cols-[1fr_200px_auto] gap-3">
                        <input className={input} placeholder="Ex.: 20% off no jantar de quinta" value={ofTitulo} onChange={(e) => setOfTitulo(e.target.value)} />
                        <input type="datetime-local" className={input} value={ofAte} onChange={(e) => setOfAte(e.target.value)} />
                        <button className={botao} onClick={() => criarOfertaEquipe(f.id)}><Plus size={14} /> Criar oferta</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2b) OFERTAS DA EQUIPE */}
      <div className={card}>
        <h2 className="text-sm font-black mb-1">Ofertas da equipe (carrossel de ofertas)</h2>
        <p className="text-[#A0A0B2] text-xs mb-4">Os quadradinhos que passam de lado nas categorias mostram só o texto da oferta — ex.: &ldquo;2 caipirinhas por R$ 49&rdquo;, &ldquo;Entrada free&rdquo;, &ldquo;Tome 3 pague 2&rdquo;. O local só aparece quando a pessoa toca. Aqui a equipe cria ofertas em qualquer local, sem limite mensal.</p>
        <div className="grid md:grid-cols-[1fr_1fr_190px_auto] gap-3 mb-4 items-end">
          <div>
            <label className={label}>Local</label>
            <input className={input} placeholder={oeLocal ? oeLocal.nome : 'Digite 2+ letras'} value={oeBusca} onChange={(e) => setOeBusca(e.target.value)} />
            {oeAchados.length > 0 && (
              <div className="mt-1 bg-[#0B0B0E] border border-[#232230] rounded-xl overflow-hidden">
                {oeAchados.map((a) => (<button key={a.id} className="block w-full text-left text-xs px-3 py-2 hover:bg-[#1D1C29]" onClick={() => { setOeLocal(a); setOeBusca(''); setOeAchados([]); }}>{a.nome}</button>))}
              </div>
            )}
            {oeLocal && <p className="text-[11px] text-emerald-400 mt-1">Local: {oeLocal.nome}</p>}
          </div>
          <div><label className={label}>Texto da oferta</label><input className={input} maxLength={60} value={oeTitulo} onChange={(e) => setOeTitulo(e.target.value)} placeholder="2 caipirinhas por R$ 49" /></div>
          <div><label className={label}>Vale até (opcional)</label><input type="datetime-local" className={input} value={oeAte} onChange={(e) => setOeAte(e.target.value)} /></div>
          <button className={botao} onClick={criarOfertaLivre}><Plus size={14} /> Criar</button>
        </div>
        <div className="space-y-2">
          {ofertasEq.length === 0 && <p className="text-xs text-[#626274]">Nenhuma oferta da equipe ainda.</p>}
          {ofertasEq.map((o) => (
            <div key={o.id} className="flex items-center gap-3 bg-[#0B0B0E] border border-[#232230] rounded-xl p-3">
              <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{o.titulo}</p><p className="text-[11px] text-[#8888A0]">{o.nome}{o.valido_ate ? ` · até ${o.valido_ate.slice(0, 10)}` : ''}</p></div>
              <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={o.ativo} onChange={() => alternarOferta(o)} /> ativa</label>
              <button className="text-[#626274] hover:text-red-400" onClick={() => apagarOferta(o.id)} aria-label="Apagar"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* 3) LIMITES */}
      <div className={card}>
        <h2 className="text-sm font-black mb-1">Ofertas por mês, por plano</h2>
        <p className="text-[#A0A0B2] text-xs mb-4">Quantas ofertas (cupons) cada plano pode criar por mês. Em branco = sem limite. A trava é no banco: o parceiro não passa do número, e a equipe/admin não tem limite.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {PLANOS.map((p) => (
            <div key={p}>
              <label className={label}>{p}</label>
              <input className={input} inputMode="numeric" placeholder="sem limite" value={limites[p] ?? ''} onChange={(e) => setLimites({ ...limites, [p]: e.target.value.replace(/\D/g, '') })} />
            </div>
          ))}
        </div>
        <button className={botao} onClick={salvarLimites}><Save size={14} /> Salvar limites</button>
      </div>

      {/* 4) DESEMPENHO */}
      <div className={card}>
        <h2 className="text-sm font-black mb-1">Desempenho da vitrine (30 dias)</h2>
        <p className="text-[#A0A0B2] text-xs mb-4">Exibições e toques por seção — o número que a equipe comercial mostra ao parceiro. Medição anônima.</p>
        {desempenho.length === 0 ? <p className="text-xs text-[#626274]">Ainda sem dados.</p> : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[#8888A0]"><th className="py-1">Seção</th><th className="py-1 text-right">Exibições</th><th className="py-1 text-right">Toques</th><th className="py-1 text-right">Taxa</th></tr></thead>
            <tbody>
              {desempenho.map((d) => (
                <tr key={d.secao} className="border-t border-[#232230]"><td className="py-1.5">{d.secao}</td><td className="text-right">{d.exib}</td><td className="text-right">{d.cliq}</td><td className="text-right">{d.exib ? `${((d.cliq / d.exib) * 100).toFixed(1)}%` : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
