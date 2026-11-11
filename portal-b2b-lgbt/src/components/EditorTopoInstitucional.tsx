'use client';
// Rodada 142 — Museu e "Viaje pelo Brasil" (Dicas Trip), os 2 primeiros cartões do topo da Home.
// Antes eram fixos no código do app; agora a equipe edita aqui. Grava em banners_app com chave 'topo_museu' / 'topo_trip'
// e tela 'home_topo' (essa tela não aparece no carrossel de parceiros). Sem registro salvo, o app usa o texto padrão.
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Cartao = { id?: string; chave: 'topo_museu' | 'topo_trip'; tag: string; titulo: string; cta: string; cor: string; destino: string; ativo: boolean };

const PADRAO: Record<Cartao['chave'], Cartao> = {
  topo_museu: { chave: 'topo_museu', tag: 'MUSEU DA DIVERSIDADE', titulo: 'Museu da Diversidade Sexual: memória e cultura LGBT+ no centro de SP', cta: 'Conhecer', cor: '#6D28D9', destino: '/apoiador/museu-diversidade', ativo: true },
  topo_trip: { chave: 'topo_trip', tag: 'DICAS TRIP', titulo: 'Viaje pelo Brasil com quem entende a comunidade', cta: 'Explorar a Trip', cor: '#10B981', destino: '/(tabs)/tourism', ativo: true },
};
const NOME: Record<Cartao['chave'], string> = { topo_museu: 'Museu da Diversidade', topo_trip: 'Dicas Trip ("Viaje pelo Brasil")' };
const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-[#E1306C]';
const label = 'text-[10px] font-bold text-[#A0A0B2] uppercase tracking-wide block mb-1';

export default function EditorTopoInstitucional() {
  const [cartoes, setCartoes] = useState<Cartao[]>([PADRAO.topo_museu, PADRAO.topo_trip]);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    supabase.from('banners_app').select('id, chave, tag, titulo, cta, cor, destino, ativo').in('chave', ['topo_museu', 'topo_trip']).then(({ data }) => {
      const rows = (data as any[]) || [];
      setCartoes((['topo_museu', 'topo_trip'] as const).map((k) => {
        const r = rows.find((x) => x.chave === k);
        return r ? { ...PADRAO[k], ...r, tag: r.tag || '', titulo: r.titulo || '', cta: r.cta || '', cor: r.cor || PADRAO[k].cor, destino: r.destino || PADRAO[k].destino } : PADRAO[k];
      }));
    });
  }, []);

  const mudar = (k: string, c: Partial<Cartao>) => setCartoes((l) => l.map((x) => (x.chave === k ? { ...x, ...c } : x)));
  const salvar = async (c: Cartao) => {
    if (!c.titulo.trim()) { setMsg({ tipo: 'erro', texto: 'Escreva o título.' }); return; }
    setSalvando(c.chave); setMsg(null);
    const dados = { chave: c.chave, tag: c.tag.trim(), titulo: c.titulo.trim(), cta: c.cta.trim() || 'Conhecer', cor: c.cor, destino: c.destino.trim(), ativo: c.ativo, telas: ['home_topo'], icone: c.chave === 'topo_trip' ? 'compass' : 'book-open', parceria: 'institucional', peso: 1 };
    const r = c.id ? await supabase.from('banners_app').update(dados).eq('id', c.id).select('id').single() : await supabase.from('banners_app').insert(dados).select('id').single();
    setSalvando(null);
    if (r.error) { setMsg({ tipo: 'erro', texto: r.error.message }); return; }
    mudar(c.chave, { id: (r.data as any).id });
    setMsg({ tipo: 'ok', texto: `${NOME[c.chave]} salvo. Já vale no app.` });
  };

  return (
    <div className="bg-[#161520] border border-[#232230] rounded-xl p-4">
      <p className="text-sm font-bold">Topo da Home: Museu e Dicas Trip</p>
      <p className="text-[11px] text-[#A0A0B2] mb-3">Os 2 primeiros cartões do carrossel do topo, antes dos Membros Fundadores. Desmarque &ldquo;Aparece no app&rdquo; para tirar um deles.</p>
      <div className="grid lg:grid-cols-2 gap-3">
        {cartoes.map((c) => (
          <div key={c.chave} className="rounded-xl border border-[#232230] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">{NOME[c.chave]}</p>
              <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"><input type="checkbox" className="accent-[#E1306C]" checked={c.ativo} onChange={(e) => mudar(c.chave, { ativo: e.target.checked })} /> Aparece no app</label>
            </div>
            <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${c.cor}, ${c.chave === 'topo_trip' ? '#0E7490' : '#DB2777'})`, opacity: c.ativo ? 1 : 0.4 }}>
              <p className="text-[9px] font-black tracking-wider opacity-90">{c.tag}</p>
              <p className="text-sm font-black leading-tight">{c.titulo}</p>
              <span className="inline-block mt-1.5 text-[10px] font-bold bg-white text-black rounded-full px-2.5 py-0.5">{c.cta}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div><label className={label}>Etiqueta</label><input className={input} maxLength={40} value={c.tag} onChange={(e) => mudar(c.chave, { tag: e.target.value })} /></div>
              <div><label className={label}>Cor</label><input type="color" className="w-9 h-[34px] bg-transparent rounded cursor-pointer" value={c.cor} onChange={(e) => mudar(c.chave, { cor: e.target.value })} /></div>
            </div>
            <div><label className={label}>Título</label><input className={input} maxLength={90} value={c.titulo} onChange={(e) => mudar(c.chave, { titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label}>Botão</label><input className={input} maxLength={24} value={c.cta} onChange={(e) => mudar(c.chave, { cta: e.target.value })} /></div>
              <div><label className={label}>Leva para</label><input className={input} placeholder="/rota, local:ID ou https://" value={c.destino} onChange={(e) => mudar(c.chave, { destino: e.target.value })} /></div>
            </div>
            <button type="button" onClick={() => salvar(c)} disabled={salvando === c.chave} className="bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-40">
              {salvando === c.chave ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
            </button>
          </div>
        ))}
      </div>
      {msg && <p className={`text-[11px] mt-2 ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.texto}</p>}
    </div>
  );
}
