'use client';
// Rodada 143 — cartões do topo da Home (antes dos Membros Fundadores): adicionar, editar, ordenar, ligar/desligar e excluir.
// Grava em banners_app com telas = ['home_topo'] (essa tela não entra no carrossel de parceiros). Ordem = campo peso.
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Cartao = { id?: string; chave: string | null; tag: string; titulo: string; cta: string; cor: string; destino: string; ativo: boolean; peso: number };

const NOVO: Cartao = { chave: null, tag: '', titulo: '', cta: 'Conhecer', cor: '#E1306C', destino: '', ativo: true, peso: 99 };
const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none focus:border-[#E1306C]';
const label = 'text-[10px] font-bold text-[#A0A0B2] uppercase tracking-wide block mb-1';
const segunda = (c: Cartao) => (c.chave === 'topo_trip' ? '#0E7490' : '#DB2777');

export default function EditorTopoInstitucional() {
  const [lista, setLista] = useState<Cartao[]>([]);
  const [aberto, setAberto] = useState<string | null>(null); // id em edição ou 'novo'
  const [rascunho, setRascunho] = useState<Cartao>(NOVO);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('banners_app').select('id, chave, tag, titulo, cta, cor, destino, ativo, peso').contains('telas', ['home_topo']);
    if (error) { setMsg({ tipo: 'erro', texto: error.message }); return; }
    setLista(((data as any[]) || []).map((r) => ({ ...NOVO, ...r, tag: r.tag || '', titulo: r.titulo || '', cta: r.cta || '', cor: r.cor || '#E1306C', destino: r.destino || '', peso: r.peso ?? 0 }))
      .sort((a, b) => a.peso - b.peso));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const gravar = async (c: Cartao) => {
    const dados = { chave: c.chave, tag: c.tag.trim(), titulo: c.titulo.trim(), cta: c.cta.trim() || 'Conhecer', cor: c.cor, destino: c.destino.trim(), ativo: c.ativo, peso: c.peso, telas: ['home_topo'], icone: 'star', parceria: 'institucional' };
    return c.id ? supabase.from('banners_app').update(dados).eq('id', c.id) : supabase.from('banners_app').insert(dados);
  };
  const salvar = async () => {
    if (!rascunho.titulo.trim()) { setMsg({ tipo: 'erro', texto: 'Escreva o título.' }); return; }
    setOcupado(true);
    const c = aberto === 'novo' ? { ...rascunho, peso: (lista[lista.length - 1]?.peso ?? 0) + 1 } : rascunho;
    const { error } = await gravar(c);
    setOcupado(false);
    if (error) { setMsg({ tipo: 'erro', texto: error.message }); return; }
    setMsg({ tipo: 'ok', texto: 'Salvo. Já vale no app.' }); setAberto(null); carregar();
  };
  const alternar = async (c: Cartao) => {
    const { error } = await supabase.from('banners_app').update({ ativo: !c.ativo }).eq('id', c.id!);
    if (error) setMsg({ tipo: 'erro', texto: error.message }); else carregar();
  };
  const mover = async (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= lista.length) return;
    const nova = [...lista]; [nova[i], nova[j]] = [nova[j], nova[i]];
    setLista(nova);
    await Promise.all(nova.map((c, k) => supabase.from('banners_app').update({ peso: k + 1 }).eq('id', c.id!)));
    carregar();
  };
  const excluir = async (c: Cartao) => {
    if (!confirm(`Excluir o cartão "${c.titulo}" do topo da Home?`)) return;
    const { error } = await supabase.from('banners_app').delete().eq('id', c.id!);
    if (error) setMsg({ tipo: 'erro', texto: error.message }); else { setMsg({ tipo: 'ok', texto: 'Excluído.' }); carregar(); }
  };

  const formulario = (
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 mt-2 border-t border-[#232230] pt-3">
      <div className="rounded-lg p-3 self-start" style={{ background: `linear-gradient(135deg, ${rascunho.cor}, ${segunda(rascunho)})` }}>
        <p className="text-[9px] font-black tracking-wider opacity-90">{rascunho.tag || 'ETIQUETA'}</p>
        <p className="text-sm font-black leading-tight">{rascunho.titulo || 'Título do cartão'}</p>
        <span className="inline-block mt-1.5 text-[10px] font-bold bg-white text-black rounded-full px-2.5 py-0.5">{rascunho.cta || 'Conhecer'}</span>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div><label className={label}>Etiqueta</label><input className={input} maxLength={40} value={rascunho.tag} onChange={(e) => setRascunho({ ...rascunho, tag: e.target.value })} /></div>
          <div><label className={label}>Cor</label><input type="color" className="w-8 h-[30px] bg-transparent rounded cursor-pointer" value={rascunho.cor} onChange={(e) => setRascunho({ ...rascunho, cor: e.target.value })} /></div>
        </div>
        <div><label className={label}>Título</label><input className={input} maxLength={90} value={rascunho.titulo} onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={label}>Botão</label><input className={input} maxLength={24} value={rascunho.cta} onChange={(e) => setRascunho({ ...rascunho, cta: e.target.value })} /></div>
          <div><label className={label}>Leva para</label><input className={input} placeholder="https://, local:ID ou /rota" value={rascunho.destino} onChange={(e) => setRascunho({ ...rascunho, destino: e.target.value })} /></div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={salvar} disabled={ocupado} className="bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-40">
            {ocupado ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
          </button>
          <button type="button" onClick={() => setAberto(null)} className="text-xs text-[#A0A0B2] hover:text-white inline-flex items-center gap-1"><X size={12} /> Cancelar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#161520] border border-[#232230] rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-sm font-bold">Topo da Home</p>
        <button type="button" onClick={() => { setRascunho(NOVO); setAberto('novo'); }} className="text-xs font-bold text-white bg-[#E1306C] hover:bg-[#C2285C] px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><Plus size={12} /> Adicionar cartão</button>
      </div>
      <p className="text-[11px] text-[#A0A0B2] mb-3">Os primeiros cartões do carrossel do topo, nesta ordem. Depois deles giram os Membros Fundadores.</p>
      {aberto === 'novo' && <div className="rounded-lg border border-[#E1306C]/50 p-3 mb-2"><p className="text-xs font-bold">Novo cartão</p>{formulario}</div>}
      <ul className="space-y-1.5">
        {lista.map((c, i) => (
          <li key={c.id} className={`rounded-lg border ${aberto === c.id ? 'border-[#E1306C]/50' : 'border-[#232230]'} p-2`}>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-7 rounded shrink-0" style={{ background: `linear-gradient(135deg, ${c.cor}, ${segunda(c)})`, opacity: c.ativo ? 1 : 0.35 }} />
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold truncate ${c.ativo ? '' : 'text-[#626274] line-through'}`}>{c.titulo}</p>
                <p className="text-[10px] text-[#8888A0] truncate">{c.tag || 'sem etiqueta'} · {c.ativo ? 'no ar' : 'desligado'}</p>
              </div>
              <button type="button" title="Subir" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1 text-[#A0A0B2] hover:text-white disabled:opacity-20"><ArrowUp size={13} /></button>
              <button type="button" title="Descer" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} className="p-1 text-[#A0A0B2] hover:text-white disabled:opacity-20"><ArrowDown size={13} /></button>
              <label className="flex items-center gap-1 text-[10px] text-[#A0A0B2] cursor-pointer px-1"><input type="checkbox" className="accent-[#E1306C]" checked={c.ativo} onChange={() => alternar(c)} /> no ar</label>
              <button type="button" title="Editar" onClick={() => { setRascunho(c); setAberto(aberto === c.id ? null : c.id!); }} className="p-1 text-[#A0A0B2] hover:text-white"><Pencil size={13} /></button>
              <button type="button" title="Excluir" onClick={() => excluir(c)} className="p-1 text-[#A0A0B2] hover:text-red-400"><Trash2 size={13} /></button>
            </div>
            {aberto === c.id && formulario}
          </li>
        ))}
        {lista.length === 0 && <li className="text-[11px] text-[#626274]">Nenhum cartão salvo: o app mostra Museu e Dicas Trip (padrão).</li>}
      </ul>
      {msg && <p className={`text-[11px] mt-2 ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.texto}</p>}
    </div>
  );
}
