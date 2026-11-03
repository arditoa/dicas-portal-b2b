'use client';
// "Posição no app" — janela que abre em cada local do /admin > Locais (nov/2026).
// Em um só lugar a Andrea define: categoria, subcategoria, plano (Fundador / Premium / Intermediário…),
// se é Membro Fundador, e qual vaga o local ocupa: Patrocínio Master da categoria, Banner Premium (1–12) ou Intermediário (1–24).
// Tabelas: locais, local_badges, categoria_patrocinio (059), vitrine_vaga (071).
import { Check, Loader2, Save, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SUBCATEGORIAS_APP } from '../lib/subcategoriasApp';

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const sec = 'border border-[#232230] rounded-xl p-4 mb-4';

// categoria REAL do banco → slug da categoria no app (chave das vagas e do Patrocínio Master)
const SLUG_DA_CATEGORIA: Record<string, string> = {
  lugares: 'bares', gastronomia: 'gastronomia', cultura: 'cultura', turismo: 'turismo', servicos: 'servicos', produtos: 'produtos',
  educacao: 'educacao', artistas: 'artistas', beleza: 'beleza', mais18: 'mais18', lazer: 'lazer', lojas: 'lojas', eventos: 'festas',
};
const NOME_CATEGORIA: Record<string, string> = {
  lugares: 'Bares & Vida Noturna', gastronomia: 'Gastronomia', cultura: 'Cultura', turismo: 'Turismo | Dicas Trip', servicos: 'Serviços', produtos: 'Compras & Produtos',
  educacao: 'Educação', artistas: 'Artistas', beleza: 'Beleza & Estética', mais18: 'Espaços 18+', lazer: 'Experiências & Lazer', lojas: 'Lojas', eventos: 'Festas & Eventos',
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

export default function PosicaoLocal({ localId, onFechar, onSalvo }: { localId: string; onFechar: () => void; onSalvo?: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [local, setLocal] = useState<Local | null>(null);
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [plano, setPlano] = useState('freemium');
  const [status, setStatus] = useState('ativo');
  const [fundador, setFundador] = useState(false);
  const [fundadorOriginal, setFundadorOriginal] = useState(false);
  const [vagaPremium, setVagaPremium] = useState(0);
  const [vagaInter, setVagaInter] = useState(0);
  const [original, setOriginal] = useState({ premium: 0, inter: 0, slug: '', master: false });
  const [ocupPremium, setOcupPremium] = useState<Ocupante>({});
  const [ocupInter, setOcupInter] = useState<Ocupante>({});
  const [master, setMaster] = useState(false);
  const [masterAtual, setMasterAtual] = useState<string | null>(null);
  const [outras, setOutras] = useState<string[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]); // categorias EXTRAS (migration 072)
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const slug = SLUG_DA_CATEGORIA[categoria] || categoria;

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
    const { data: v } = await supabase.from('vitrine_vaga').select('categoria, tipo, posicao').eq('local_id', localId);
    const meuSlug = SLUG_DA_CATEGORIA[loc.categoria] || loc.categoria;
    const doSlug = ((v as any[]) || []).filter((x) => x.categoria === meuSlug);
    const p = doSlug.find((x) => x.tipo === 'premium')?.posicao || 0;
    const i = doSlug.find((x) => x.tipo === 'intermediario')?.posicao || 0;
    setVagaPremium(p); setVagaInter(i);
    setOutras(((v as any[]) || []).filter((x) => x.categoria !== meuSlug).map((x) => `${x.categoria} · ${x.tipo === 'premium' ? 'Premium' : 'Intermediário'} ${x.posicao}`));
    const { data: pt } = await supabase.from('categoria_patrocinio').select('local_id').eq('categoria', meuSlug).maybeSingle();
    const eMaster = (pt as any)?.local_id === localId;
    setMaster(eMaster);
    setOriginal({ premium: p, inter: i, slug: meuSlug, master: eMaster });
    setCarregando(false);
  }, [localId]);
  useEffect(() => { carregar(); }, [carregar]);

  // Quem ocupa cada vaga da categoria escolhida (para avisar quando uma troca expulsa outro local).
  useEffect(() => {
    if (!categoria) return;
    (async () => {
      const { data } = await supabase.from('vitrine_vaga').select('tipo, posicao, local_id, locais(nome)').eq('categoria', slug);
      const a: Ocupante = {}; const b: Ocupante = {};
      for (const r of (data as any[]) || []) { if (r.local_id === localId) continue; (r.tipo === 'premium' ? a : b)[r.posicao] = r.locais?.nome || 'outro local'; }
      setOcupPremium(a); setOcupInter(b);
      const { data: pt } = await supabase.from('categoria_patrocinio').select('local_id, titulo, locais(nome)').eq('categoria', slug).maybeSingle();
      setMasterAtual(pt && (pt as any).local_id !== localId ? ((pt as any).locais?.nome || (pt as any).titulo || 'outro patrocinador') : null);
    })();
  }, [slug, categoria, localId]);

  const subs = SUBCATEGORIAS_APP[categoria]?.itens || [];
  const subNaLista = subs.some((s) => s.rotulo === subcategoria);
  const infoPlano = PLANOS.find((p) => p.v === plano);

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
      // 3) vagas (as da categoria antiga saem se a categoria mudou)
      for (const [tipo, nova, antiga] of [['premium', vagaPremium, original.premium], ['intermediario', vagaInter, original.inter]] as const) {
        if (nova === antiga && original.slug === slug) continue;
        const { error: ed } = await supabase.from('vitrine_vaga').delete().eq('local_id', localId).eq('tipo', tipo).eq('categoria', original.slug);
        if (ed) throw ed;
        if (nova > 0) {
          await supabase.from('vitrine_vaga').delete().eq('local_id', localId).eq('tipo', tipo).eq('categoria', slug);
          const { error } = await supabase.from('vitrine_vaga').upsert({ categoria: slug, tipo, posicao: nova, local_id: localId, atualizado_em: new Date().toISOString() }, { onConflict: 'categoria,tipo,posicao' });
          if (error) throw error;
        }
      }
      // 4) Patrocínio Master
      if (master !== original.master || original.slug !== slug) {
        if (original.master && (!master || original.slug !== slug)) await supabase.from('categoria_patrocinio').update({ local_id: null }).eq('categoria', original.slug).eq('local_id', localId);
        if (master) {
          const { data: ex } = await supabase.from('categoria_patrocinio').select('id, destino').eq('categoria', slug).maybeSingle();
          const { error } = ex
            ? await supabase.from('categoria_patrocinio').update({ local_id: localId, destino: (ex as any).destino || `local:${localId}` }).eq('categoria', slug)
            : await supabase.from('categoria_patrocinio').insert({ categoria: slug, local_id: localId, tag: 'PATROCÍNIO MASTER', titulo: local.nome, cta: 'Conhecer', destino: `local:${localId}`, cor1: '#7E57C2', cor2: '#E1306C', ativo: true });
          if (error) throw error;
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
                  <label className={label}>Categoria</label>
                  <select className={input} value={categoria} onChange={(e) => { setCategoria(e.target.value); setSubcategoria(''); setVagaPremium(0); setVagaInter(0); setMaster(false); }}>
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
              <p className="text-[11px] text-[#626274] mt-2">Esta é a categoria <b>principal</b>. Mudar a categoria muda a página onde ele aparece no app. As vagas abaixo valem para a categoria principal.</p>

              <div className="mt-4 border-t border-[#232230] pt-3">
                <p className="text-xs font-bold mb-1">Também aparece em outras categorias</p>
                <p className="text-[11px] text-[#A0A0B2] mb-3">Um local pode estar em mais de uma categoria (ex.: um bar que também é casa de shows em Artistas), cada uma com a sua subcategoria. Ele aparece nas listas e ícones de todas elas.</p>
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
                <button type="button" onClick={() => setExtras((a) => [...a, { categoria: '', subcategoria: '' }])} className="text-xs font-bold text-[#E1306C]">+ Adicionar outra categoria</button>
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
              {plano === 'fundador' && status === 'ativo' && !fundador && <p className="text-[11px] text-amber-400 mt-1">Plano Fundador ativo normalmente liga o selo — confira se quer mesmo sem selo.</p>}
            </div>

            <div className={sec}>
              <p className="text-sm font-black mb-1">3 · Vaga no app <span className="text-[#A0A0B2] font-semibold">({NOME_CATEGORIA[categoria] || categoria})</span></p>
              <p className="text-[11px] text-[#A0A0B2] mb-3">Sem vaga escolhida o app decide sozinho pelo plano. Escolha uma vaga para fixar a posição dele.</p>
              <label className="flex items-start gap-2 text-xs cursor-pointer mb-1"><input type="checkbox" className="accent-[#E1306C] mt-0.5" checked={master} onChange={(e) => setMaster(e.target.checked)} />
                <span><b>Patrocínio Master</b> da categoria (a faixa grande do topo; 1 só)</span></label>
              {master && masterAtual && <p className="text-[11px] text-amber-400 ml-6 mb-2">Hoje a faixa é de &ldquo;{masterAtual}&rdquo; — este local vai assumir o lugar (a arte e os dizeres você ajusta em Categorias).</p>}
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className={label}>Banner Premium (12 vagas · 4 por hora)</label>
                  <select className={input} value={vagaPremium} onChange={(e) => setVagaPremium(Number(e.target.value))}>
                    <option value={0}>Nenhuma (automático pelo plano)</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Vaga {n}{ocupPremium[n] ? ` — hoje: ${ocupPremium[n]}` : ' — livre'}</option>)}
                  </select>
                  {vagaPremium > 0 && ocupPremium[vagaPremium] && <p className="text-[11px] text-amber-400 mt-1">Vai tirar {ocupPremium[vagaPremium]} desta vaga.</p>}
                  {vagaPremium > 0 && plano !== 'premium' && plano !== 'fundador' && <p className="text-[11px] text-amber-400 mt-1">O plano dele não é Premium/Fundador — aparece só porque você fixou.</p>}
                </div>
                <div>
                  <label className={label}>Cupom na categoria (24 vagas · 6 por vez)</label>
                  <select className={input} value={vagaInter} onChange={(e) => setVagaInter(Number(e.target.value))}>
                    <option value={0}>Nenhuma (automático pelo plano)</option>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Vaga {n} · {n <= 10 ? 'Premium' : n <= 12 ? 'Fundador' : 'Intermediário'}{ocupInter[n] ? ` — hoje: ${ocupInter[n]}` : ' — livre'}</option>)}
                  </select>
                  {vagaInter > 0 && ocupInter[vagaInter] && <p className="text-[11px] text-amber-400 mt-1">Vai tirar {ocupInter[vagaInter]} desta vaga.</p>}
                  {vagaInter > 0 && plano !== (vagaInter <= 10 ? 'premium' : vagaInter <= 12 ? 'fundador' : 'intermediario') && <p className="text-[11px] text-amber-400 mt-1">Esta vaga é do grupo {vagaInter <= 10 ? 'Premium' : vagaInter <= 12 ? 'Fundador' : 'Intermediário'}, mas o plano dele é outro — o quadradinho mostra o cupom ativo dele, se houver.</p>}
                </div>
              </div>
              {outras.length > 0 && <p className="text-[11px] text-[#626274] mt-3">Também ocupa (outras páginas, não mexidas aqui): {outras.join(' · ')}</p>}
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
