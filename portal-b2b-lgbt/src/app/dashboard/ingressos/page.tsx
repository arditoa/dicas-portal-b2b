'use client';
// Portal da casa — Ingressos (mesmas regras do app parceiro, src/app/parceiro/ingressos.tsx; migrações 131/132):
// conectar o Mercado Pago, ligar a venda de cada festa, lotes (preço, quantidade, meia, datas), virada automática,
// cupons, cortesias, vendas ao vivo, compradores com reembolso e o LINK DA PÁGINA DE VENDA (/e/<festa>) para divulgar.
import { Check, Copy, CreditCard, ExternalLink, Gift, Loader2, Plus, Ticket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParceiro } from '../../../components/parceiro/ParceiroContext';
import { reais } from '../../../lib/ingressosWeb';

type Festa = { id: string; titulo: string; data_inicio: string; ingressos_ativos: boolean; ingresso_taxa_paga_por: 'comprador' | 'casa'; ingresso_virada_automatica: boolean };
type Lote = { id: string; nome: string; preco_centavos: number; quantidade: number; permite_meia: boolean; ativo: boolean; ordem: number; inicio_venda: string | null; fim_venda: string | null; cortesia: boolean };
type CupomIng = { id: string; codigo: string; tipo: 'pct' | 'valor'; valor: number; limite_usos: number | null; ativo: boolean };
type Vendas = { vendidos: number; entraram: number; meias: number; bruto_centavos: number; taxa_casa_centavos: number; lotes: { id: string; vendidos: number }[] };
type Comprador = { pedido_id: string; status: string; total_centavos: number; desconto_centavos: number; pago_em: string | null; cortesia: boolean;
  ingressos: { titular: string; lote: string; meia: boolean; status: string; resgatar: boolean; codigo: string | null }[] };

const LOTE_VAZIO = { id: '', nome: '1º lote', preco: '', quantidade: '100', permite_meia: true, inicio: '', fim: '' };
const centavos = (v: string) => Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100);
const diaDe = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10) : '');
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const inp = 'bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const btn = 'bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition';
const btnSec = 'border border-[#232230] hover:border-[#E1306C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition';

export default function IngressosPortal() {
  const parceiro = useParceiro();
  const localId = parceiro?.local.id || '';
  const dono = !!parceiro; // o painel abre o local do dono logado; o banco confere de novo (mp_iniciar_conexao)
  const pct = 5; // 140: igual em todos os planos (ingresso_config)

  const [mp, setMp] = useState<{ conectado: boolean; desde: string | null } | null>(null);
  const [festas, setFestas] = useState<Festa[] | null>(null);
  const [sel, setSel] = useState<Festa | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [vendas, setVendas] = useState<Vendas | null>(null);
  const [cupons, setCupons] = useState<CupomIng[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [form, setForm] = useState<typeof LOTE_VAZIO | null>(null);
  const [formCupom, setFormCupom] = useState<{ codigo: string; tipo: 'pct' | 'valor'; valor: string; limite: string } | null>(null);
  const [nomesCortesia, setNomesCortesia] = useState<string | null>(null);
  const [linksCortesia, setLinksCortesia] = useState<string>('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    if (!localId) return;
    const [m, f] = await Promise.all([
      supabase.rpc('mp_status_da_casa', { p_local: localId }),
      supabase.from('eventos').select('id, titulo, data_inicio, ingressos_ativos, ingresso_taxa_paga_por, ingresso_virada_automatica')
        .eq('local_id', localId).gte('data_inicio', new Date(Date.now() - 12 * 3600e3).toISOString()).neq('status', 'cancelado').order('data_inicio').limit(30),
    ]);
    setMp((m.data as { conectado: boolean; desde: string | null }) || { conectado: false, desde: null });
    const lista = (f.data as Festa[]) || [];
    setFestas(lista);
    setSel((s) => (s ? lista.find((x) => x.id === s.id) || null : lista[0] || null));
  }, [localId]);
  useEffect(() => { void carregar(); }, [carregar]);

  const carregarFesta = useCallback(async (f: Festa) => {
    const [l, v, c, cp] = await Promise.all([
      supabase.from('ingresso_lotes').select('id, nome, preco_centavos, quantidade, permite_meia, ativo, ordem, inicio_venda, fim_venda, cortesia').eq('evento_id', f.id).order('ordem'),
      supabase.rpc('vendas_do_evento', { p_evento: f.id }),
      supabase.from('ingresso_cupons').select('id, codigo, tipo, valor, limite_usos, ativo').eq('evento_id', f.id).order('created_at'),
      supabase.rpc('compradores_do_evento', { p_evento: f.id }),
    ]);
    setLotes(((l.data as Lote[]) || []).filter((x) => !x.cortesia));
    setVendas((v.data as Vendas) || null);
    setCupons((c.data as CupomIng[]) || []);
    setCompradores((cp.data as Comprador[]) || []);
  }, []);
  useEffect(() => {
    if (!sel) return;
    void carregarFesta(sel);
    const t = setInterval(() => { void carregarFesta(sel); }, 30000);
    return () => clearInterval(t);
  }, [sel, carregarFesta]);

  const conectarMp = async () => {
    const { data, error } = await supabase.rpc('mp_iniciar_conexao', { p_local: localId });
    if (error || !data) return setAviso(error?.message || 'Não deu agora.');
    window.location.href = `/api/mp/conectar?estado=${data}`;
  };

  const mudarFesta = async (campos: Partial<Festa>) => {
    if (!sel) return;
    setAviso('');
    if (campos.ingressos_ativos && !lotes.some((l) => l.ativo)) return setAviso('Crie pelo menos um lote antes de ligar a venda.');
    if (campos.ingressos_ativos && lotes.some((l) => l.ativo && l.preco_centavos > 0) && !mp?.conectado) return setAviso('Para vender ingresso pago, conecte primeiro o Mercado Pago da casa.');
    const { error } = await supabase.from('eventos').update(campos).eq('id', sel.id);
    if (error) return setAviso(error.message);
    const nova = { ...sel, ...campos };
    setSel(nova);
    setFestas((festas || []).map((x) => (x.id === nova.id ? nova : x)));
  };

  const salvarLote = async () => {
    if (!sel || !form) return;
    const preco = form.preco.trim() ? centavos(form.preco) : 0;
    const qtd = parseInt(form.quantidade, 10);
    if (form.nome.trim().length < 2) return setAviso('Dê um nome ao lote (ex.: 1º lote, Pista, Camarote).');
    if (Number.isNaN(preco) || preco < 0) return setAviso('Confira o preço (ex.: 40 ou 39,90). Em branco = grátis.');
    if (!qtd || qtd < 1) return setAviso('Quantos ingressos tem este lote?');
    if (form.inicio && form.fim && form.fim < form.inicio) return setAviso('A data de parar de vender vem antes da de começar.');
    setSalvando(true);
    const campos = { nome: form.nome.trim().slice(0, 40), preco_centavos: preco, quantidade: qtd, permite_meia: form.permite_meia,
      inicio_venda: form.inicio ? `${form.inicio}T00:00:00-03:00` : null, fim_venda: form.fim ? `${form.fim}T23:59:59-03:00` : null };
    const { error } = form.id ? await supabase.from('ingresso_lotes').update(campos).eq('id', form.id)
      : await supabase.from('ingresso_lotes').insert({ ...campos, evento_id: sel.id, ordem: lotes.length });
    setSalvando(false);
    if (error) return setAviso(error.message);
    setForm(null); setAviso('');
    void carregarFesta(sel);
  };
  const ligarLote = async (l: Lote, ativo: boolean) => { await supabase.from('ingresso_lotes').update({ ativo }).eq('id', l.id); if (sel) void carregarFesta(sel); };

  const salvarCupom = async () => {
    if (!sel || !formCupom) return;
    const codigo = formCupom.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return setAviso('Código de 3 a 20 letras e números, sem espaço (ex.: VEZPA10).');
    const valor = formCupom.tipo === 'pct' ? parseInt(formCupom.valor, 10) : centavos(formCupom.valor);
    if (!valor || valor < 1 || (formCupom.tipo === 'pct' && valor > 100)) return setAviso(formCupom.tipo === 'pct' ? 'Desconto de 1 a 100%.' : 'Coloque o valor do desconto em reais.');
    const limite = formCupom.limite.trim() ? parseInt(formCupom.limite, 10) : null;
    const { error } = await supabase.from('ingresso_cupons').insert({ evento_id: sel.id, codigo, tipo: formCupom.tipo, valor, limite_usos: limite && limite > 0 ? limite : null });
    if (error) return setAviso(error.message.includes('duplicate') ? 'Já existe um cupom com esse código nesta festa.' : error.message);
    setFormCupom(null); setAviso('');
    void carregarFesta(sel);
  };
  const ligarCupom = async (c: CupomIng, ativo: boolean) => { await supabase.from('ingresso_cupons').update({ ativo }).eq('id', c.id); if (sel) void carregarFesta(sel); };

  const emitirCortesias = async () => {
    if (!sel || nomesCortesia === null) return;
    const nomes = nomesCortesia.split('\n').map((n) => n.trim()).filter((n) => n.length >= 2);
    if (!nomes.length) return setAviso('Escreva um nome por linha.');
    if (nomes.length > 50) return setAviso('Até 50 nomes por vez.');
    setSalvando(true);
    const { data, error } = await supabase.rpc('emitir_cortesias', { p_evento: sel.id, p_nomes: nomes });
    setSalvando(false);
    if (error) return setAviso(error.message);
    const base = window.location.origin;
    setLinksCortesia(((data as { titular: string; codigo: string }[]) || []).map((c) => `${c.titular}: ${base}/cortesia/${c.codigo}`).join('\n'));
    setNomesCortesia(null);
    void carregarFesta(sel);
  };

  const reembolsar = async (c: Comprador) => {
    if (!confirm(`Devolver ${reais(c.total_centavos)} pelo Mercado Pago e cancelar ${c.ingressos.length > 1 ? `os ${c.ingressos.length} ingressos` : 'o ingresso'}? O valor sai da conta Mercado Pago da casa.`)) return;
    const { data } = await supabase.auth.getSession();
    const r = await fetch('/api/ingressos/reembolsar', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ pedido_id: c.pedido_id }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setAviso(j.error || 'Não deu agora.');
    if (sel) void carregarFesta(sel);
  };

  if (!parceiro) return <div className="p-8 text-[#A0A0B2]">Entre com a conta da casa para vender ingressos.</div>;
  if (festas === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#E1306C]" size={28} /></div>;

  const link = sel ? `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${sel.id}` : '';
  const vendidosLote = (id: string) => vendas?.lotes?.find((x) => x.id === id)?.vendidos || 0;

  return (
    <div className="p-8 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-black">Ingressos</h1>
      <p className="text-[#A0A0B2] text-xs mt-1 mb-6">Venda pelo app e pela página da festa no site. O dinheiro cai direto na conta Mercado Pago da casa. Taxa do Dicas: {pct}% (mínimo R$ 1). Se o comprador paga a taxa, a tarifa do Mercado Pago vai junto e a casa recebe o ingresso cheio.</p>

      {/* Mercado Pago */}
      <div className={`bg-[#161520] border rounded-2xl p-5 mb-6 ${mp?.conectado ? 'border-emerald-500/30' : 'border-[#232230]'}`}>
        <div className="flex items-center gap-3">
          <CreditCard size={18} className="text-[#009EE3]" />
          <div className="flex-1">
            <p className="font-bold text-sm">Mercado Pago</p>
            <p className={`text-xs ${mp?.conectado ? 'text-emerald-400' : 'text-[#A0A0B2]'}`}>{mp?.conectado ? `Conectado${mp.desde ? ` desde ${new Date(mp.desde).toLocaleDateString('pt-BR')}` : ''}` : 'Não conectado: só dá para emitir ingressos grátis.'}</p>
          </div>
          {dono ? <button onClick={conectarMp} className={mp?.conectado ? btnSec : btn}>{mp?.conectado ? 'Trocar conta' : 'Conectar Mercado Pago'}</button>
            : !mp?.conectado ? <span className="text-xs text-[#E1306C]">Só o dono conecta.</span> : null}
        </div>
      </div>

      {festas.length === 0 ? (
        <p className="text-[#A0A0B2] text-sm bg-[#161520] border border-[#232230] rounded-2xl p-5">Nenhuma festa nos próximos dias. Crie em <a href="/dashboard/eventos" className="underline text-white">Meus eventos</a>.</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {festas.map((f) => (
              <button key={f.id} onClick={() => { setSel(f); setForm(null); setFormCupom(null); setAviso(''); setLinksCortesia(''); }}
                className={`shrink-0 text-left px-4 py-2.5 rounded-xl border text-xs ${sel?.id === f.id ? 'bg-white text-black border-white' : 'border-[#232230]'}`}>
                <span className="font-bold block">{f.titulo.slice(0, 28)}</span>{quando(f.data_inicio)}{f.ingressos_ativos ? ' · à venda' : ''}
              </button>
            ))}
          </div>

          {aviso && <div className="text-xs p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-200 mb-4">{aviso}</div>}

          {sel && (
            <div className="flex flex-col gap-5">
              {/* Venda e link */}
              <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5">
                <label className="flex items-center justify-between gap-3 text-sm font-bold">
                  Vender ingressos desta festa
                  <input type="checkbox" checked={sel.ingressos_ativos} onChange={(e) => mudarFesta({ ingressos_ativos: e.target.checked })} className="w-5 h-5 accent-[#E1306C]" />
                </label>
                <div className="flex flex-wrap gap-4 mt-4 text-xs text-[#A0A0B2]">
                  <label className="flex items-center gap-2">Taxa paga pelo
                    <select value={sel.ingresso_taxa_paga_por} onChange={(e) => mudarFesta({ ingresso_taxa_paga_por: e.target.value as 'comprador' | 'casa' })} className={inp}>
                      <option value="comprador">comprador</option><option value="casa">casa</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={sel.ingresso_virada_automatica} onChange={(e) => mudarFesta({ ingresso_virada_automatica: e.target.checked })} />
                    Virada automática (abre o próximo lote quando um esgota ou vence)</label>
                </div>
                <div className="mt-5 border-t border-[#232230] pt-4">
                  <p className="text-xs font-bold mb-2">Página de venda no site (para WhatsApp, Instagram e bio)</p>
                  <div className="flex gap-2">
                    <input readOnly value={link} className={`${inp} flex-1 text-xs`} />
                    <button onClick={async () => { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} className={btnSec}>{copiado ? <Check size={14} /> : <Copy size={14} />}</button>
                    <a href={link} target="_blank" rel="noreferrer" className={btnSec}><ExternalLink size={14} /></a>
                  </div>
                  {!sel.ingressos_ativos && <p className="text-[11px] text-[#626274] mt-2">A página já abre, mas só vende depois que você ligar a venda.</p>}
                </div>
              </div>

              {/* Vendas */}
              {vendas && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[['Vendidos', String(vendas.vendidos)], ['Entraram', String(vendas.entraram)], ['Vendas', reais(vendas.bruto_centavos)], ['Taxa paga pela casa', reais(vendas.taxa_casa_centavos)]].map(([r, v]) => (
                    <div key={r} className="bg-[#161520] border border-[#232230] rounded-2xl p-4"><p className="text-xl font-black">{v}</p><p className="text-[#A0A0B2] text-xs">{r}</p></div>
                  ))}
                </div>
              )}

              {/* Lotes */}
              <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold flex items-center gap-2"><Ticket size={16} className="text-[#E1306C]" /> Lotes</h2>
                  <button onClick={() => setForm({ ...LOTE_VAZIO, nome: `${lotes.length + 1}º lote` })} className={btnSec}><Plus size={14} className="inline" /> Novo lote</button>
                </div>
                {lotes.length === 0 && !form && <p className="text-xs text-[#A0A0B2]">Nenhum lote ainda.</p>}
                {lotes.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 py-2 border-b border-[#232230] last:border-0 text-sm">
                    <div className="flex-1">
                      <p className="font-bold">{l.nome} · {l.preco_centavos ? reais(l.preco_centavos) : 'Grátis'}{l.permite_meia && l.preco_centavos ? ' (com meia)' : ''}</p>
                      <p className="text-xs text-[#A0A0B2]">{vendidosLote(l.id)} de {l.quantidade} vendidos{l.inicio_venda ? ` · de ${diaDe(l.inicio_venda).split('-').reverse().join('/')}` : ''}{l.fim_venda ? ` até ${diaDe(l.fim_venda).split('-').reverse().join('/')}` : ''}</p>
                    </div>
                    <button onClick={() => setForm({ id: l.id, nome: l.nome, preco: l.preco_centavos ? (l.preco_centavos / 100).toFixed(2).replace('.', ',') : '', quantidade: String(l.quantidade), permite_meia: l.permite_meia, inicio: diaDe(l.inicio_venda), fim: diaDe(l.fim_venda) })} className="text-xs underline text-[#A0A0B2]">Editar</button>
                    <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={l.ativo} onChange={(e) => ligarLote(l, e.target.checked)} /> à venda</label>
                  </div>
                ))}
                {form && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <input className={inp} placeholder="Nome (ex.: Pista)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                    <input className={inp} placeholder="Preço em R$ (vazio = grátis)" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} inputMode="decimal" />
                    <input className={inp} placeholder="Quantidade" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} inputMode="numeric" />
                    <label className="text-xs flex items-center gap-2 text-[#A0A0B2]"><input type="checkbox" checked={form.permite_meia} onChange={(e) => setForm({ ...form, permite_meia: e.target.checked })} /> Tem meia-entrada</label>
                    <label className="text-xs text-[#A0A0B2] flex flex-col gap-1">Começa a vender<input type="date" className={inp} value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label>
                    <label className="text-xs text-[#A0A0B2] flex flex-col gap-1">Para de vender<input type="date" className={inp} value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></label>
                    <div className="col-span-2 flex gap-2"><button onClick={salvarLote} disabled={salvando} className={btn}>{salvando ? 'Salvando…' : 'Salvar lote'}</button><button onClick={() => setForm(null)} className={btnSec}>Cancelar</button></div>
                  </div>
                )}
              </div>

              {/* Cupons */}
              <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold">Cupons de desconto</h2>
                  <button onClick={() => setFormCupom({ codigo: '', tipo: 'pct', valor: '', limite: '' })} className={btnSec}><Plus size={14} className="inline" /> Novo cupom</button>
                </div>
                {cupons.length === 0 && !formCupom && <p className="text-xs text-[#A0A0B2]">Nenhum cupom.</p>}
                {cupons.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm border-b border-[#232230] last:border-0">
                    <span><b>{c.codigo}</b> · {c.tipo === 'pct' ? `${c.valor}%` : reais(c.valor)}{c.limite_usos ? ` · até ${c.limite_usos} usos` : ''}</span>
                    <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={c.ativo} onChange={(e) => ligarCupom(c, e.target.checked)} /> ligado</label>
                  </div>
                ))}
                {formCupom && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input className={`${inp} uppercase`} placeholder="CÓDIGO" value={formCupom.codigo} onChange={(e) => setFormCupom({ ...formCupom, codigo: e.target.value })} />
                    <select className={inp} value={formCupom.tipo} onChange={(e) => setFormCupom({ ...formCupom, tipo: e.target.value as 'pct' | 'valor' })}><option value="pct">%</option><option value="valor">R$</option></select>
                    <input className={`${inp} w-24`} placeholder="Valor" value={formCupom.valor} onChange={(e) => setFormCupom({ ...formCupom, valor: e.target.value })} />
                    <input className={`${inp} w-28`} placeholder="Limite (opcional)" value={formCupom.limite} onChange={(e) => setFormCupom({ ...formCupom, limite: e.target.value })} />
                    <button onClick={salvarCupom} className={btn}>Salvar</button><button onClick={() => setFormCupom(null)} className={btnSec}>Cancelar</button>
                  </div>
                )}
              </div>

              {/* Cortesias */}
              <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold flex items-center gap-2"><Gift size={16} className="text-[#E1306C]" /> Cortesias</h2>
                  {nomesCortesia === null && <button onClick={() => setNomesCortesia('')} className={btnSec}>Emitir cortesias</button>}
                </div>
                <p className="text-xs text-[#A0A0B2]">Um link por pessoa. Ela abre e guarda o ingresso na conta (site ou app).</p>
                {nomesCortesia !== null && (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea rows={5} className={inp} placeholder={'Um nome por linha (até 50)\nAna Souza\nBruno Lima'} value={nomesCortesia} onChange={(e) => setNomesCortesia(e.target.value)} />
                    <div className="flex gap-2"><button onClick={emitirCortesias} disabled={salvando} className={btn}>Gerar links</button><button onClick={() => setNomesCortesia(null)} className={btnSec}>Cancelar</button></div>
                  </div>
                )}
                {!!linksCortesia && (
                  <div className="mt-3">
                    <textarea readOnly rows={Math.min(10, linksCortesia.split('\n').length + 1)} className={`${inp} w-full text-xs`} value={linksCortesia} />
                    <button onClick={() => navigator.clipboard.writeText(linksCortesia)} className={`${btnSec} mt-2`}>Copiar todos os links</button>
                  </div>
                )}
              </div>

              {/* Compradores */}
              <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5">
                <h2 className="text-sm font-bold mb-1">Compradores</h2>
                <p className="text-xs text-[#A0A0B2] mb-3">Nome de cada ingresso, sem contato. O perfil do público (idade, chegada, novos e recorrentes) fica em Seu público, no app parceiro (Premium e Fundador).</p>
                {compradores.length === 0 ? <p className="text-xs text-[#A0A0B2]">Nenhum pedido ainda.</p> : compradores.map((c) => (
                  <div key={c.pedido_id} className="py-2 border-b border-[#232230] last:border-0 text-sm flex items-start gap-3">
                    <div className="flex-1">
                      {c.ingressos.map((i, k) => (
                        <p key={k}>{i.titular} <span className="text-xs text-[#A0A0B2]">· {i.lote}{i.meia ? ' (meia)' : ''}{i.status === 'usado' ? ' · entrou' : i.status === 'cancelado' ? ' · cancelado' : ''}{i.resgatar ? ' · cortesia não aberta' : ''}</span></p>
                      ))}
                      <p className="text-xs text-[#626274]">{c.cortesia ? 'Cortesia' : reais(c.total_centavos)}{c.desconto_centavos ? ` · desconto ${reais(c.desconto_centavos)}` : ''} · {c.status}</p>
                    </div>
                    {c.status === 'pago' && c.total_centavos > 0 && <button onClick={() => reembolsar(c)} className="text-xs underline text-[#A0A0B2]">Reembolsar</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
