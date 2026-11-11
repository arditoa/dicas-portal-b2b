'use client';
// Rodada 144 — Caixas da Home (Em Alta, Recomendados, O que fazer hoje, Top da semana, Experiências, Serviços e as novas).
// Renomear, trocar ícone e cores, ordenar, ocultar, criar e excluir. Tabela home_caixas (migration 097).
// Tipos: 'padrao' (as 6 originais: a lista é montada pelo app), 'curadoria' (locais marcados na ficha do local)
// e 'link' (abre uma categoria, rota do app ou site).
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Caixa = { chave: string; titulo: string; subtitulo: string; icone: string; cor1: string; cor2: string; ordem: number; ativo: boolean; tipo: 'padrao' | 'curadoria' | 'link'; destino: string };

// Ícones (nomes do Feather, os mesmos do app).
export const ICONES_CAIXA = ['star', 'trending-up', 'check-circle', 'zap', 'heart', 'briefcase', 'music', 'coffee', 'sun', 'moon', 'gift', 'map-pin', 'compass', 'camera', 'award', 'smile', 'shopping-bag', 'book-open', 'flag', 'feather'];
const DEGRADES: [string, string][] = [['#CC7A0A', '#9A4A0A'], ['#0DA372', '#0E7490'], ['#C026A3', '#6D3FD1'], ['#F2692A', '#C42660'], ['#0A8FD0', '#7048B8'], ['#0F9F90', '#5558E3'], ['#E1306C', '#7E22CE'], ['#334155', '#0F172A']];
const NOVA: Caixa = { chave: '', titulo: '', subtitulo: '', icone: 'star', cor1: '#E1306C', cor2: '#7E22CE', ordem: 99, ativo: true, tipo: 'curadoria', destino: '' };
const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none focus:border-[#E1306C]';
const label = 'text-[10px] font-bold text-[#A0A0B2] uppercase tracking-wide block mb-1';
const CATEGORIAS_LINK = ['bares', 'festas', 'gastronomia', 'cultura', 'turismo', 'servicos', 'beleza', 'artistas', 'lojas', 'produtos', 'saude', 'educacao', 'lazer', 'mais18', 'destaques'];

const slug = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
const TIPO_ROTULO: Record<Caixa['tipo'], string> = { padrao: 'lista automática do app', curadoria: 'locais escolhidos pela equipe', link: 'abre um link' };

export default function EditorCaixasHome() {
  const [lista, setLista] = useState<Caixa[]>([]);
  const [faltaTabela, setFaltaTabela] = useState(false);
  const [qtdCuradoria, setQtdCuradoria] = useState<Record<string, number>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [rasc, setRasc] = useState<Caixa>(NOVA);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('home_caixas').select('*');
    if (error) { setFaltaTabela(true); return; }
    const l = ((data as any[]) || []).map((r) => ({ ...NOVA, ...r, subtitulo: r.subtitulo || '', destino: r.destino || '' })).sort((a, b) => a.ordem - b.ordem);
    setLista(l);
    const cur = l.filter((c) => c.tipo === 'curadoria');
    const qs = await Promise.all(cur.map((c) => supabase.from('locais').select('id', { count: 'exact', head: true }).contains('destaque_secoes', [`caixa:${c.chave}`])));
    const m: Record<string, number> = {};
    cur.forEach((c, i) => { m[c.chave] = qs[i].count || 0; });
    setQtdCuradoria(m);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!rasc.titulo.trim()) { setMsg({ tipo: 'erro', texto: 'Escreva o nome da caixa.' }); return; }
    if (rasc.tipo === 'link' && !rasc.destino.trim()) { setMsg({ tipo: 'erro', texto: 'Escolha para onde a caixa leva.' }); return; }
    setOcupado(true);
    const nova = aberto === 'nova';
    let chave = rasc.chave;
    if (nova) {
      chave = slug(rasc.titulo) || `caixa-${Date.now()}`;
      if (lista.some((c) => c.chave === chave)) chave = `${chave}-${Date.now() % 1000}`;
    }
    const dados = { chave, titulo: rasc.titulo.trim(), subtitulo: rasc.subtitulo.trim() || null, icone: rasc.icone, cor1: rasc.cor1, cor2: rasc.cor2, ativo: rasc.ativo, tipo: rasc.tipo, destino: rasc.tipo === 'link' ? rasc.destino.trim() : null, ordem: nova ? (lista[lista.length - 1]?.ordem ?? 0) + 1 : rasc.ordem, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('home_caixas').upsert(dados);
    setOcupado(false);
    if (error) { setMsg({ tipo: 'erro', texto: error.message }); return; }
    setMsg({ tipo: 'ok', texto: nova && rasc.tipo === 'curadoria' ? 'Caixa criada. Agora marque os locais dela na ficha de cada local (Locais e marcas → Caixas da Home).' : 'Salvo. Já vale no app.' });
    setAberto(null); carregar();
  };
  const alternar = async (c: Caixa) => {
    const { error } = await supabase.from('home_caixas').update({ ativo: !c.ativo }).eq('chave', c.chave);
    if (error) setMsg({ tipo: 'erro', texto: error.message }); else carregar();
  };
  const mover = async (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= lista.length) return;
    const nova = [...lista]; [nova[i], nova[j]] = [nova[j], nova[i]];
    setLista(nova);
    await Promise.all(nova.map((c, k) => supabase.from('home_caixas').update({ ordem: k + 1 }).eq('chave', c.chave)));
    carregar();
  };
  const excluir = async (c: Caixa) => {
    if (!confirm(`Excluir a caixa "${c.titulo}"? Os locais marcados nela continuam no app, só a caixa some.`)) return;
    const { error } = await supabase.from('home_caixas').delete().eq('chave', c.chave);
    if (error) setMsg({ tipo: 'erro', texto: error.message }); else { setMsg({ tipo: 'ok', texto: 'Caixa excluída.' }); carregar(); }
  };

  if (faltaTabela) {
    return (
      <div className="bg-[#161520] border border-amber-500/40 rounded-xl p-4 text-xs text-amber-300">
        <b>Caixas da Home:</b> rode a migration <b>097_caixas_da_home.sql</b> no Supabase (SQL Editor) para editar nomes, ocultar e criar caixas.
      </div>
    );
  }

  const form = (
    <div className="grid md:grid-cols-[150px_minmax(0,1fr)] gap-3 mt-2 border-t border-[#232230] pt-3">
      <div className="h-[92px] rounded-xl flex flex-col items-center justify-center gap-1.5 text-white self-start" style={{ background: `linear-gradient(135deg, ${rasc.cor1}, ${rasc.cor2})`, opacity: rasc.ativo ? 1 : 0.4 }}>
        <span className="text-[10px] opacity-80">{rasc.icone}</span>
        <span className="text-sm font-black text-center px-2 leading-tight">{rasc.titulo || 'Nome da caixa'}</span>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={label}>Nome na Home</label><input className={input} maxLength={24} value={rasc.titulo} onChange={(e) => setRasc({ ...rasc, titulo: e.target.value })} /></div>
          <div><label className={label}>Frase da página (opcional)</label><input className={input} maxLength={80} value={rasc.subtitulo} onChange={(e) => setRasc({ ...rasc, subtitulo: e.target.value })} /></div>
        </div>
        {rasc.tipo !== 'padrao' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>O que a caixa mostra</label>
              <select className={input} value={rasc.tipo} onChange={(e) => setRasc({ ...rasc, tipo: e.target.value as Caixa['tipo'] })}>
                <option value="curadoria">Locais escolhidos pela equipe</option>
                <option value="link">Abre uma categoria ou link</option>
              </select>
            </div>
            {rasc.tipo === 'link' && (
              <div>
                <label className={label}>Leva para</label>
                <input className={input} list="destinos-caixa" placeholder="categoria:bares, /rota ou https://" value={rasc.destino} onChange={(e) => setRasc({ ...rasc, destino: e.target.value })} />
                <datalist id="destinos-caixa">{CATEGORIAS_LINK.map((c) => <option key={c} value={`categoria:${c}`} />)}</datalist>
              </div>
            )}
          </div>
        )}
        <div>
          <label className={label}>Ícone</label>
          <div className="flex flex-wrap gap-1">
            {ICONES_CAIXA.map((ic) => (
              <button key={ic} type="button" onClick={() => setRasc({ ...rasc, icone: ic })} className={`text-[10px] px-2 py-1 rounded border ${rasc.icone === ic ? 'border-[#E1306C] bg-[#E1306C]/15 text-white' : 'border-[#232230] text-[#A0A0B2] hover:text-white'}`}>{ic}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Cores</label>
          <div className="flex flex-wrap gap-1.5 items-center">
            {DEGRADES.map(([a, b]) => (
              <button key={a + b} type="button" onClick={() => setRasc({ ...rasc, cor1: a, cor2: b })} className={`w-7 h-7 rounded-md border-2 ${rasc.cor1 === a && rasc.cor2 === b ? 'border-white' : 'border-transparent'}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} />
            ))}
            <input type="color" className="w-7 h-7 bg-transparent rounded cursor-pointer" value={rasc.cor1} onChange={(e) => setRasc({ ...rasc, cor1: e.target.value })} title="Cor 1" />
            <input type="color" className="w-7 h-7 bg-transparent rounded cursor-pointer" value={rasc.cor2} onChange={(e) => setRasc({ ...rasc, cor2: e.target.value })} title="Cor 2" />
          </div>
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
        <p className="text-sm font-bold">Caixas da Home</p>
        <button type="button" onClick={() => { setRasc(NOVA); setAberto('nova'); }} className="text-xs font-bold text-white bg-[#E1306C] hover:bg-[#C2285C] px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><Plus size={12} /> Nova caixa</button>
      </div>
      <p className="text-[11px] text-[#A0A0B2] mb-3">Os quadrados coloridos da Home (3 por linha), nesta ordem. Renomeie, troque cor e ícone, oculte ou crie novas.</p>
      {aberto === 'nova' && <div className="rounded-lg border border-[#E1306C]/50 p-3 mb-2"><p className="text-xs font-bold">Nova caixa</p>{form}</div>}
      <ul className="space-y-1.5">
        {lista.map((c, i) => (
          <li key={c.chave} className={`rounded-lg border ${aberto === c.chave ? 'border-[#E1306C]/50' : 'border-[#232230]'} p-2`}>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-md shrink-0" style={{ background: `linear-gradient(135deg, ${c.cor1}, ${c.cor2})`, opacity: c.ativo ? 1 : 0.35 }} />
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold truncate ${c.ativo ? '' : 'text-[#626274] line-through'}`}>{c.titulo}</p>
                <p className="text-[10px] text-[#8888A0] truncate">
                  {TIPO_ROTULO[c.tipo]}{c.tipo === 'curadoria' ? ` · ${qtdCuradoria[c.chave] ?? 0} locais` : ''}{c.tipo === 'link' ? ` · ${c.destino}` : ''} · {c.ativo ? 'no ar' : 'oculta'}
                </p>
              </div>
              <button type="button" title="Subir" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1 text-[#A0A0B2] hover:text-white disabled:opacity-20"><ArrowUp size={13} /></button>
              <button type="button" title="Descer" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} className="p-1 text-[#A0A0B2] hover:text-white disabled:opacity-20"><ArrowDown size={13} /></button>
              <label className="flex items-center gap-1 text-[10px] text-[#A0A0B2] cursor-pointer px-1"><input type="checkbox" className="accent-[#E1306C]" checked={c.ativo} onChange={() => alternar(c)} /> no ar</label>
              <button type="button" title="Editar" onClick={() => { setRasc(c); setAberto(aberto === c.chave ? null : c.chave); }} className="p-1 text-[#A0A0B2] hover:text-white"><Pencil size={13} /></button>
              {c.tipo !== 'padrao'
                ? <button type="button" title="Excluir" onClick={() => excluir(c)} className="p-1 text-[#A0A0B2] hover:text-red-400"><Trash2 size={13} /></button>
                : <span className="w-[21px]" title="As 6 caixas originais não se excluem: use “no ar” para ocultar" />}
            </div>
            {aberto === c.chave && form}
          </li>
        ))}
      </ul>
      {msg && <p className={`text-[11px] mt-2 ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.texto}</p>}
    </div>
  );
}

// Na ficha do local: marcar em quais caixas de curadoria (criadas acima) o local aparece.
export function CaixasCuradoriaLocal({ secoes, disabled, onAlternar }: { secoes: string[]; disabled?: boolean; onAlternar: (secao: string, marcar: boolean) => void }) {
  const [caixas, setCaixas] = useState<{ chave: string; titulo: string }[]>([]);
  useEffect(() => {
    supabase.from('home_caixas').select('chave, titulo, ordem').eq('tipo', 'curadoria').then(({ data }) => {
      setCaixas((((data as any[]) || []) as any[]).sort((a, b) => a.ordem - b.ordem));
    }, () => {});
  }, []);
  if (caixas.length === 0) return null;
  return (
    <>
      {caixas.map((c) => (
        <label key={c.chave} className="flex items-start gap-1.5 text-xs text-[#D0D0E0] cursor-pointer">
          <input type="checkbox" className="accent-[#E1306C] mt-0.5" checked={secoes.includes(`caixa:${c.chave}`)} disabled={disabled} onChange={(e) => onAlternar(`caixa:${c.chave}`, e.target.checked)} />
          <span>Caixa {c.titulo}<span className="block text-[10px] text-[#626274]">criada no Mapa do app</span></span>
        </label>
      ))}
    </>
  );
}
