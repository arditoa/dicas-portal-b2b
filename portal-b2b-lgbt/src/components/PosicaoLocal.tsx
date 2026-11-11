'use client';
// "Posição no app" — janela que abre em cada local do /admin > Locais (nov/2026).
// Em um só lugar a Andrea define: categoria, subcategoria, plano (Fundador / Premium / Intermediário…),
// se é Membro Fundador, e qual vaga o local ocupa: Patrocínio Master da categoria, Banner Premium (1–12) ou Intermediário (1–24).
//
// Atualizado: as vagas agora valem POR CATEGORIA. O local mostra um bloco de vagas para cada lugar onde aparece:
//   - a categoria principal;
//   - cada categoria extra ("Também aparece em…", ex.: Bares + Festas & Eventos);
//   - "Destaques (Fundadores)" quando é Membro Fundador;
//   - qualquer outra página onde ele já ocupa uma vaga (para nunca perder uma vaga sem querer).
// Tabelas: locais, local_badges, categoria_patrocinio (059), vitrine_vaga (071), local_categorias_extra (072).
import { Check, Loader2, Save, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SUBCATEGORIAS_APP } from '../lib/subcategoriasApp';

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const sec = 'border border-[#232230] rounded-xl p-4 mb-4';

// categoria REAL do banco → slug da categoria no app (chave das vagas e do Patrocínio Master)
const SLUG_DA_CATEGORIA: Record<string, string> = {
  lugares: 'bares', gastronomia: 'gastronomia', cultura: 'cultura', turismo: 'turismo', servicos: 'servicos', produtos: 'produtos',
  educacao: 'educacao', artistas: 'artistas', beleza: 'beleza', mais18: 'mais18', saude: 'saude', lazer: 'lazer', lojas: 'lojas', eventos: 'festas',
};
const NOME_CATEGORIA: Record<string, string> = {
  lugares: 'Bares & Vida Noturna', gastronomia: 'Gastronomia', cultura: 'Cultura', turismo: 'Turismo | Dicas Trip', servicos: 'Serviços', produtos: 'Moda & Acessórios',
  educacao: 'Educação', artistas: 'Artistas', beleza: 'Beleza & Estética', mais18: 'Espaços 18+', saude: 'Saúde & Bem-estar', lazer: 'Experiências & Lazer', lojas: 'Lojas', eventos: 'Festas & Eventos',
};
// slug do app → nome da página (inclui as páginas que não têm categoria real no banco)
const NOME_SLUG: Record<string, string> = {
  ...Object.fromEntries(Object.entries(SLUG_DA_CATEGORIA).map(([real, slug]) => [slug, NOME_CATEGORIA[real]])),
  destaques: 'Destaques (Fundadores)',
  saude: 'Saúde & Bem-estar',
  comunidade: 'Comunidade & Apoio',
};
const PLANOS: { v: string; nome: string; explica: string }[] = [
  { v: 'freemium', nome: 'Gratuito', explica: 'Aparece na lista da categoria, sem destaque.' },
  { v: 'starter', nome: 'Starter (será descontinuado)', explica: 'Plano antigo — aparece na lista, sem banner.' },
  { v: 'intermediario', nome: 'Intermediário', explica: 'Cupom no quadradinho da categoria (1 cupom a cada 2 semanas; os 24 Intermediários se alternam em 12 vagas, 12 por hora).' },
  { v: 'premium', nome: 'Premium', explica: 'Banner Premium da categoria (rodando 4 por hora, 12 vagas) e cupom semanal na faixa de cupons. O parceiro altera a frase do banner toda semana.' },
  { v: 'fundador', nome: 'Fundador', explica: 'Selo Membro Fundador, banner nos Destaques e na Home. A equipe escreve a frase; ele pode ajustar.' },
];
const STATUS: [string, string][] = [['ativo', 'Ativo (pago/confirmado)'], ['interesse', 'Pediu o plano (aguardando você)'], ['aguardando_pagamento', 'Aguardando pagamento'], ['cancelado', 'Cancelado']];

type Local = { id: string; nome: string; categoria: string; subcategoria: string | null; plano_comercial: string; plano_comercial_status: string };
type Extra = { categoria: string; subcategoria: string };
type Ocupante = Record<number, string>; // posição → nome de quem ocupa
type Vaga = { premium: number; inter: number; master: boolean }; // vagas deste local numa página
type Bloco = { slug: string; nome: string; origem: 'principal' | 'extra' | 'fundadores' | 'outra' };
type Ocup = { premium: Ocupante; inter: Ocupante; masterAtual: string | null };

const VAGA_ZERO: Vaga = { premium: 0, inter: 0, master: false };
const OCUP_VAZIO: Ocup = { premium: {}, inter: {}, masterAtual: null };
const copiar = (m: Record<string, Vaga>): Record<string, Vaga> => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v }]));

const ROTULO_ORIGEM: Record<Bloco['origem'], string> = {
  principal: 'categoria principal',
  extra: 'também aparece aqui',
  fundadores: 'página dos Fundadores',
  outra: 'vaga já existente',
};

export default function PosicaoLocal({ localId, onFechar, onSalvo }: { localId: string; onFechar: () => void; onSalvo?: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [local, setLocal] = useState<Local | null>(null);
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [plano, setPlano] = useState('freemium');
  const [status, setStatus] = useState('ativo');
  const [fundador, setFundador] = useState(false);
  const [fundadorOriginal, setFundadorOriginal] = useState(false);
  const [vagas, setVagas] = useState<Record<string, Vaga>>({});
  const [original, setOriginal] = useState<Record<string, Vaga>>({});
  const [ocup, setOcup] = useState<Record<string, Ocup>>({});
  const [extras, setExtras] = useState<Extra[]>([]); // categorias EXTRAS (migration 072)
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const slugPrincipal = SLUG_DA_CATEGORIA[categoria] || categoria;

  const carregar = useCallback(async () => {
    const { data: l } = await supabase.from('locais').select('id, nome, categoria, subcategoria, plano_comercial, plano_comercial_status').eq('id', localId).maybeSingle();
    if (!l) { setErro('Local não encontrado.'); setCarregando(false); return; }
    const loc = l as unknown as Local;
    setLocal(loc);
    setCategoria(loc.categoria); setSubcategoria(loc.subcategoria || ''); setPlano(loc.plano_comercial); setStatus(loc.plano_comercial_status);
    const { data: ex } = await supabase.from('local_categorias_extra').select('categoria, subcategoria').eq('local_id', localId);
    setExtras(((ex as any[]) || []).map((x) => ({ categoria: x.categoria as string, subcategoria: (x.subcategoria as string) || '' })));
    const { data: b } = await supabase.from('local_badges').select('id, ativo').eq('local_id', localId).ilike('rotulo', '%fundador%').maybeSingle();
    const f = !!(b as any)?.ativo;
    setFundador(f); setFundadorOriginal(f);

    // todas as vagas que este local ocupa, em qualquer página
    const mapa: Record<string, Vaga> = {};
    const g = (slug: string) => (mapa[slug] ||= { ...VAGA_ZERO });
    const { data: v } = await supabase.from('vitrine_vaga').select('categoria, tipo, posicao').eq('local_id', localId);
    for (const x of (v as any[]) || []) { if (x.tipo === 'premium') g(x.categoria).premium = x.posicao; else g(x.categoria).inter = x.posicao; }
    const { data: pts } = await supabase.from('categoria_patrocinio').select('categoria').eq('local_id', localId);
    for (const x of (pts as any[]) || []) g(x.categoria).master = true;
    setVagas(copiar(mapa)); setOriginal(copiar(mapa));
    setCarregando(false);
  }, [localId]);
  useEffect(() => { carregar(); }, [carregar]);

  // Páginas (blocos de vagas) onde o local aparece.
  const blocos = useMemo<Bloco[]>(() => {
    const lista: Bloco[] = [];
    const vistos = new Set<string>();
    const add = (slug: string, origem: Bloco['origem']) => {
      if (!slug || vistos.has(slug)) return;
      vistos.add(slug);
      lista.push({ slug, nome: NOME_SLUG[slug] || slug, origem });
    };
    if (categoria) add(slugPrincipal, 'principal');
    extras.forEach((x) => { if (x.categoria) add(SLUG_DA_CATEGORIA[x.categoria] || x.categoria, 'extra'); });
    if (fundador) add('destaques', 'fundadores');
    Object.keys(original).forEach((s) => add(s, 'outra'));
    return lista;
  }, [categoria, slugPrincipal, extras, fundador, original]);

  // Quem ocupa cada vaga de cada página (para avisar quando uma troca expulsa outro local).
  const chaveSlugs = blocos.map((b) => b.slug).join(',');
  useEffect(() => {
    if (!chaveSlugs) return;
    const slugs = chaveSlugs.split(',');
    (async () => {
      const novo: Record<string, Ocup> = {};
      const g = (s: string) => (novo[s] ||= { premium: {}, inter: {}, masterAtual: null });
      slugs.forEach(g);
      const { data } = await supabase.from('vitrine_vaga').select('categoria, tipo, posicao, local_id, locais(nome)').in('categoria', slugs);
      for (const r of (data as any[]) || []) {
        if (r.local_id === localId) continue;
        (r.tipo === 'premium' ? g(r.categoria).premium : g(r.categoria).inter)[r.posicao] = r.locais?.nome || 'outro local';
      }
      const { data: pts } = await supabase.from('categoria_patrocinio').select('categoria, local_id, titulo, locais(nome)').in('categoria', slugs);
      for (const p of (pts as any[]) || []) {
        if (p.local_id && p.local_id !== localId) g(p.categoria).masterAtual = p.locais?.nome || p.titulo || 'outro patrocinador';
      }
      setOcup(novo);
    })();
  }, [chaveSlugs, localId]);

  const subs = SUBCATEGORIAS_APP[categoria]?.itens || [];
  const subNaLista = subs.some((s) => s.rotulo === subcategoria);
  const infoPlano = PLANOS.find((p) => p.v === plano);
  const temFestasExtra = extras.some((x) => x.categoria === 'eventos') || categoria === 'eventos';

  const vagaDe = (slug: string): Vaga => vagas[slug] || VAGA_ZERO;
  const mudaVaga = (slug: string, patch: Partial<Vaga>) => setVagas((m) => ({ ...m, [slug]: { ...(m[slug] || VAGA_ZERO), ...patch } }));

  const salvar = async () => {
    if (!local) return;
    setSalvando(true); setErro(''); setAviso('');
    try {
      // 1) dados do local
      const { error: e1 } = await supabase.from('locais').update({ categoria, subcategoria: subcategoria.trim() || null, plano_comercial: plano, plano_comercial_status: plano === 'freemium' ? 'ativo' : status }).eq('id', localId);
      if (e1) throw e1;
      // 1b) categorias extras: regrava a lista inteira (sem repetir a principal)
      {
        const lista = extras.filter((x) => x.categoria && x.categoria !== categoria).filter((x, i, a) => a.findIndex((y) => y.categoria === x.categoria) === i);
        const { error: ed } = await supabase.from('local_categorias_extra').delete().eq('local_id', localId);
        if (ed) throw ed;
        if (lista.length > 0) {
          const { error: ei } = await supabase.from('local_categorias_extra').insert(lista.map((x) => ({ local_id: localId, categoria: x.categoria, subcategoria: x.subcategoria.trim() || null })));
          if (ei) throw ei;
        }
      }
      // 2) selo Membro Fundador
      if (fundador !== fundadorOriginal) {
        const { data: b } = await supabase.from('local_badges').select('id').eq('local_id', localId).ilike('rotulo', '%fundador%').maybeSingle();
        const { error } = b ? await supabase.from('local_badges').update({ ativo: fundador }).eq('id', (b as any).id) : await supabase.from('local_badges').insert({ local_id: localId, rotulo: 'Membro Fundador', cor_tag: 'dourado', ativo: fundador });
        if (error) throw error;
      }
      // 3) vagas e Patrocínio Master, página por página (só o que mudou)
      const slugs = Array.from(new Set([...Object.keys(original), ...blocos.map((b) => b.slug)]));
      for (const sl of slugs) {
        const cur = vagaDe(sl);
        const ori = original[sl] || VAGA_ZERO;
        for (const [tipo, nova, antiga] of [['premium', cur.premium, ori.premium], ['intermediario', cur.inter, ori.inter]] as const) {
          if (nova === antiga) continue;
          const { error: ed } = await supabase.from('vitrine_vaga').delete().eq('local_id', localId).eq('tipo', tipo).eq('categoria', sl);
          if (ed) throw ed;
          if (nova > 0) {
            const { error } = await supabase.from('vitrine_vaga').upsert({ categoria: sl, tipo, posicao: nova, local_id: localId, atualizado_em: new Date().toISOString() }, { onConflict: 'categoria,tipo,posicao' });
            if (error) throw error;
          }
        }
        if (cur.master !== ori.master) {
          if (ori.master && !cur.master) {
            const { error } = await supabase.from('categoria_patrocinio').update({ local_id: null }).eq('categoria', sl).eq('local_id', localId);
            if (error) throw error;
          }
          if (cur.master) {
            const { data: ex } = await supabase.from('categoria_patrocinio').select('id, destino').eq('categoria', sl).maybeSingle();
            const { error } = ex
              ? await supabase.from('categoria_patrocinio').update({ local_id: localId, destino: (ex as any).destino || `local:${localId}` }).eq('categoria', sl)
              : await supabase.from('categoria_patrocinio').insert({ categoria: sl, local_id: localId, tag: 'PATROCÍNIO MASTER', titulo: local.nome, cta: 'Conhecer', destino: `local:${localId}`, cor1: '#7E57C2', cor2: '#E1306C', ativo: true });
            if (error) throw error;
          }
        }
      }
      setAviso('Salvo — já vale no app.');
      onSalvo?.();
      await carregar();
    } catch (e: any) {
      const m = String(e?.message || e);
      setErro(/local_categorias_extra/.test(m) ? 'Rode a migration 072_local_em_varias_categorias.sql no Supabase.' : /vitrine_vaga/.test(m) ? 'Rode a migration 071_vitrine_vaga.sql no Supabase.' : /permission denied|row-level/i.test(m) ? 'O banco negou: entre com a conta de admin.' : m);
    }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4" onClick={onFechar}>
      <div className="bg-[#161520] border border-[#232230] rounded-2xl w-full max-w-2xl my-8 p-5 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black">Posição no app</h2>
            <p className="text-xs text-[#A0A0B2]">{local?.nome || '…'} — onde ele fica, qual plano tem e qual vaga ocupa.</p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="text-[#A0A0B2] hover:text-white"><X size={18} /></button>
        </div>
        {carregando ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#E1306C]" /></div> : (
          <>
            {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">{erro}</div>}
            {aviso && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs mb-4 flex items-center gap-2"><Check size={14} /> {aviso}</div>}

            <div className={sec}>
              <p className="text-sm font-black mb-3">1 · Onde ele aparece</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className={label}>Categoria principal</label>
                  <select className={input} value={categoria} onChange={(e) => { setCategoria(e.target.value); setSubcategoria(''); }}>
                    {!NOME_CATEGORIA[categoria] && <option value={categoria}>{categoria}</option>}
                    {Object.entries(NOME_CATEGORIA).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Subcategoria (ícone redondo)</label>
                  <select className={input} value={subNaLista ? subcategoria : subcategoria ? '__outra' : ''} onChange={(e) => setSubcategoria(e.target.value === '__outra' ? subcategoria : e.target.value)}>
                    <option value="">— sem subcategoria (cai em &ldquo;Outros&rdquo;) —</option>
                    {subs.map((s) => <option key={s.chave} value={s.rotulo}>{s.rotulo}</option>)}
                    {subcategoria && !subNaLista && <option value="__outra">Texto do parceiro: {subcategoria}</option>}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-[#626274] mt-2">A categoria <b>principal</b> é a página onde ele nasce no app. Cada página onde ele aparece tem as suas próprias vagas (passo 3).</p>

              <div className="mt-4 border-t border-[#232230] pt-3">
                <p className="text-xs font-bold mb-1">Também aparece em outras categorias</p>
                <p className="text-[11px] text-[#A0A0B2] mb-3">Um local pode estar em mais de uma categoria (ex.: um bar que também entra em Festas &amp; Eventos), cada uma com a sua subcategoria e as suas vagas de banner.</p>
                {extras.map((x, i) => {
                  const subsX = SUBCATEGORIAS_APP[x.categoria]?.itens || [];
                  return (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2 items-center">
                      <select className={input} value={x.categoria} onChange={(e) => setExtras((a) => a.map((y, j) => (j === i ? { categoria: e.target.value, subcategoria: '' } : y)))}>
                        <option value="">Escolha a categoria…</option>
                        {Object.entries(NOME_CATEGORIA).filter(([v]) => v !== categoria).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                      </select>
                      <select className={input} value={x.subcategoria} disabled={!x.categoria} onChange={(e) => setExtras((a) => a.map((y, j) => (j === i ? { ...y, subcategoria: e.target.value } : y)))}>
                        <option value="">— sem subcategoria —</option>
                        {subsX.map((s) => <option key={s.chave} value={s.rotulo}>{s.rotulo}</option>)}
                      </select>
                      <button type="button" onClick={() => setExtras((a) => a.filter((_, j) => j !== i))} className="text-[#E1306C] text-xs font-bold px-2" aria-label="Remover categoria">Tirar</button>
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setExtras((a) => [...a, { categoria: '', subcategoria: '' }])} className="text-xs font-bold text-[#E1306C]">+ Adicionar outra categoria</button>
                  {!temFestasExtra && (
                    <button type="button" onClick={() => setExtras((a) => [...a, { categoria: 'eventos', subcategoria: '' }])} className="text-xs font-bold text-[#E1306C]">+ Aparecer também em Festas &amp; Eventos</button>
                  )}
                </div>
              </div>
            </div>

            <div className={sec}>
              <p className="text-sm font-black mb-3">2 · Plano e selo</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className={label}>Plano</label>
                  <select className={input} value={plano} onChange={(e) => setPlano(e.target.value)}>{PLANOS.map((p) => <option key={p.v} value={p.v}>{p.nome}</option>)}</select>
                </div>
                <div>
                  <label className={label}>Situação do plano</label>
                  <select className={input} value={plano === 'freemium' ? 'ativo' : status} disabled={plano === 'freemium'} onChange={(e) => setStatus(e.target.value)}>{STATUS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
                </div>
              </div>
              {infoPlano && <p className="text-[11px] text-[#A0A0B2] mt-2">{infoPlano.explica}</p>}
              <label className="flex items-center gap-2 text-xs font-bold mt-3 cursor-pointer"><input type="checkbox" className="accent-[#FFD54F]" checked={fundador} onChange={(e) => setFundador(e.target.checked)} /> Membro Fundador (selo dourado)</label>
              <p className="text-[11px] text-[#626274] mt-1">Ligando o selo, aparece abaixo a página &ldquo;Destaques (Fundadores)&rdquo; com as vagas dos Fundadores.</p>
              {plano === 'fundador' && status === 'ativo' && !fundador && <p className="text-[11px] text-amber-400 mt-1">Plano Fundador ativo normalmente liga o selo — confira se quer mesmo sem selo.</p>}
            </div>

            <div className={sec}>
              <p className="text-sm font-black mb-1">3 · Vagas em cada página do app</p>
              <p className="text-[11px] text-[#A0A0B2] mb-3">Um quadro por página onde ele aparece. Sem vaga escolhida o app decide sozinho pelo plano; escolha uma vaga para fixar a posição dele naquela página.</p>

              {blocos.map((b) => {
                const v = vagaDe(b.slug);
                const o = ocup[b.slug] || OCUP_VAZIO;
                const dest = b.slug === 'destaques';
                const festasForaDoPool = b.slug === 'festas' && categoria !== 'eventos' && categoria !== 'lugares';
                return (
                  <div key={b.slug} className="border border-[#232230] rounded-xl p-3 mb-3 bg-[#13121A]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                      <p className="text-xs font-black">{b.nome}</p>
                      <span className="text-[10px] font-bold text-[#A0A0B2] uppercase">{ROTULO_ORIGEM[b.origem]}</span>
                    </div>

                    <label className="flex items-start gap-2 text-xs cursor-pointer mb-1">
                      <input type="checkbox" className="accent-[#E1306C] mt-0.5" checked={v.master} onChange={(e) => mudaVaga(b.slug, { master: e.target.checked })} />
                      <span><b>Patrocínio Master</b> desta página (a faixa grande do topo; 1 só). <span className="text-[#A0A0B2]">Ao tocar: abre o destino definido em Categorias (por padrão, a página do local).</span></span>
                    </label>
                    {v.master && o.masterAtual && <p className="text-[11px] text-amber-400 ml-6 mb-2">Hoje a faixa é de &ldquo;{o.masterAtual}&rdquo; — este local vai assumir o lugar (a arte e os dizeres você ajusta em Categorias).</p>}

                    <div className={`grid ${dest ? '' : 'md:grid-cols-2'} gap-3 mt-3`}>
                      <div>
                        <label className={label}>{dest ? 'Banner Fundador' : 'Banner Premium'} (12 vagas · 4 por hora)</label>
                        <select className={input} value={v.premium} onChange={(e) => mudaVaga(b.slug, { premium: Number(e.target.value) })}>
                          <option value={0}>Nenhuma (automático pelo plano)</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Vaga {n}{o.premium[n] ? ` — hoje: ${o.premium[n]}` : ' — livre'}</option>)}
                        </select>
                        <p className="text-[10px] text-[#626274] mt-1">Ao tocar: abre o link que o parceiro definiu em Comunicação ou, sem link, a página dele no app.</p>
                        {v.premium > 0 && o.premium[v.premium] && <p className="text-[11px] text-amber-400 mt-1">Vai tirar {o.premium[v.premium]} desta vaga.</p>}
                        {v.premium > 0 && !dest && plano !== 'premium' && plano !== 'fundador' && <p className="text-[11px] text-amber-400 mt-1">O plano dele não é Premium/Fundador — aparece só porque você fixou.</p>}
                        {v.premium > 0 && dest && plano !== 'fundador' && !fundador && <p className="text-[11px] text-amber-400 mt-1">Esta página é só de Fundadores — ligue o selo ou o plano Fundador.</p>}
                      </div>
                      {!dest && (
                        <div>
                          <label className={label}>Cupom na página (24 vagas · 6 por vez)</label>
                          <select className={input} value={v.inter} onChange={(e) => mudaVaga(b.slug, { inter: Number(e.target.value) })}>
                            <option value={0}>Nenhuma (automático pelo plano)</option>
                            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Vaga {n} · {n <= 10 ? 'Premium' : n <= 12 ? 'Fundador' : 'Intermediário'}{o.inter[n] ? ` — hoje: ${o.inter[n]}` : ' — livre'}</option>)}
                          </select>
                          <p className="text-[10px] text-[#626274] mt-1">Ao tocar no quadradinho: abre a página do local.</p>
                          {v.inter > 0 && o.inter[v.inter] && <p className="text-[11px] text-amber-400 mt-1">Vai tirar {o.inter[v.inter]} desta vaga.</p>}
                          {v.inter > 0 && plano !== (v.inter <= 10 ? 'premium' : v.inter <= 12 ? 'fundador' : 'intermediario') && <p className="text-[11px] text-amber-400 mt-1">Esta vaga é do grupo {v.inter <= 10 ? 'Premium' : v.inter <= 12 ? 'Fundador' : 'Intermediário'}, mas o plano dele é outro — o quadradinho mostra o cupom ativo dele, se houver.</p>}
                        </div>
                      )}
                    </div>

                    {festasForaDoPool && <p className="text-[11px] text-amber-400 mt-2">Atenção: a página de Festas só encontra locais cuja categoria principal é Bares ou Festas &amp; Eventos. Com outra categoria principal, a vaga fica vazia no app.</p>}
                    {b.origem === 'outra' && <p className="text-[11px] text-[#A0A0B2] mt-2">Este local não está mais listado nesta página, mas ainda ocupa vaga nela. Escolha &ldquo;Nenhuma&rdquo; e salve para liberar a vaga.</p>}
                  </div>
                );
              })}
              {blocos.length === 0 && <p className="text-[11px] text-[#A0A0B2]">Escolha a categoria principal para ver as vagas.</p>}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onFechar} className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition">Fechar</button>
              <button onClick={salvar} disabled={salvando} className="bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2">
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar posição
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
