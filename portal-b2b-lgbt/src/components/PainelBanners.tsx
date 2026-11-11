'use client';
// Rodada 94 — aba "Banners e parceiros" do /admin: controla os cartões do carrossel da
// Home e da Trip (Copa, Embratur, Câmara LGBT, Museu…): textos, onde aparece, peso no
// revezamento, período e relatório de exibições/cliques. Tabelas da migration 050.
import { Loader2, Pause, Pencil, Play, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { erroFotoNaoSuportada } from '../lib/validarFoto';

// Rodada 139 — onde o banner pode aparecer: Home, Trip e as páginas de categoria do app ('cat:<slug>').
const TELAS_BANNER: { v: string; rotulo: string }[] = [
  { v: 'home', rotulo: 'Home · 2º carrossel' },
  { v: 'home_c3', rotulo: 'Home · 3º carrossel' },
  { v: 'home_c4', rotulo: 'Home · 4º carrossel' },
  { v: 'trip', rotulo: 'Aba Trip' },
  { v: 'cat:destaques', rotulo: 'Destaques (Fundadores)' },
  { v: 'cat:bares', rotulo: 'Bares & Noite' },
  { v: 'cat:festas', rotulo: 'Festas' },
  { v: 'cat:servicos', rotulo: 'Serviços' },
  { v: 'cat:turismo', rotulo: 'Dicas Trip (categoria)' },
  { v: 'cat:artistas', rotulo: 'Artistas' },
  { v: 'cat:beleza', rotulo: 'Beleza' },
  { v: 'cat:saude', rotulo: 'Saúde & Bem-estar' },
  { v: 'cat:produtos', rotulo: 'Moda & Acessórios' },
  { v: 'cat:gastronomia', rotulo: 'Gastronomia' },
  { v: 'cat:cultura', rotulo: 'Cultura' },
  { v: 'cat:educacao', rotulo: 'Educação' },
  { v: 'cat:mais18', rotulo: 'Espaços 18+' },
];
const rotuloTela = (t: string) => TELAS_BANNER.find((x) => x.v === t)?.rotulo || t;

type Banner = {
  id: string;
  chave: string | null;
  tag: string;
  titulo: string;
  cta: string;
  icone: string;
  cor: string;
  logo_url: string | null;
  destino: string;
  telas: string[];
  parceria: 'patrocinio' | 'institucional' | 'proprio';
  peso: number;
  peso_periodo: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  inicio: string | null;
  fim: string | null;
  ativo: boolean;
  traducoes: Record<string, { tag?: string; titulo?: string; cta?: string }> | null;
};
type Metrica = { banner_id: string; exibicoes: number; cliques: number };

const ICONES = ['star', 'globe', 'map', 'briefcase', 'heart', 'award', 'calendar', 'music', 'users', 'flag', 'home', 'compass', 'camera', 'book-open', 'gift', 'sun'];
const PARCERIAS: { v: Banner['parceria']; rotulo: string; dica: string }[] = [
  { v: 'patrocinio', rotulo: 'Patrocinador (pago)', dica: 'Aparece com a etiqueta "APOIO". Ex.: Museu da Diversidade Sexual.' },
  { v: 'institucional', rotulo: 'Parceiro institucional (sem custo)', dica: 'Etiqueta "PARCEIRO INSTITUCIONAL". Ex.: Embratur, Câmara LGBT, CBF.' },
  { v: 'proprio', rotulo: 'Campanha própria do Dicas LGBT+', dica: 'Sem etiqueta. Ex.: Brasil 2027.' },
];
const VAZIO: Banner = {
  id: '', chave: null, tag: '', titulo: '', cta: 'Conhecer', icone: 'star', cor: '#7E57C2', logo_url: null, destino: '',
  telas: ['home', 'trip'], parceria: 'institucional', peso: 1, peso_periodo: null, periodo_inicio: null, periodo_fim: null,
  inicio: null, fim: null, ativo: true, traducoes: {},
};

function estado(b: Banner): { texto: string; cor: string } {
  const agora = Date.now();
  if (!b.ativo) return { texto: 'Pausado', cor: 'bg-[#232230] text-[#A0A0B2]' };
  if (b.inicio && new Date(b.inicio).getTime() > agora) return { texto: 'Agendado', cor: 'bg-[#7E57C2]/20 text-[#B39DDB]' };
  if (b.fim && new Date(b.fim).getTime() < agora) return { texto: 'Encerrado', cor: 'bg-[#232230] text-[#A0A0B2]' };
  return { texto: 'No ar', cor: 'bg-[#4CAF7D]/15 text-[#4CAF7D]' };
}
const paraInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
const daInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function PainelBanners({ onIrPara }: { onIrPara?: (aba: string) => void } = {}) {
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  async function subirLogo(arquivo: File | undefined) {
    if (!arquivo) return;
    const problema = erroFotoNaoSuportada(arquivo);
    if (problema) { setMsg({ ok: false, texto: problema }); return; }
    setEnviandoLogo(true);
    const ext = (arquivo.name.split('.').pop() || 'png').toLowerCase();
    const caminho = `banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fotos-destinos').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    setEnviandoLogo(false);
    if (error) { setMsg({ ok: false, texto: `Não deu para enviar: ${error.message}` }); return; }
    setEditando((x) => (x ? { ...x, logo_url: supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl } : x));
    setMsg({ ok: true, texto: 'Imagem enviada. Clique em "Salvar banner" para publicar.' });
  }
  const [lista, setLista] = useState<Banner[]>([]);
  const [filtroCarrossel, setFiltroCarrossel] = useState<string>('todos');
  const [metricas, setMetricas] = useState<Record<string, Metrica>>({});
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [b, m] = await Promise.all([
      supabase.from('banners_app').select('*').order('created_at', { ascending: true }),
      supabase.rpc('resumo_banners', { p_dias: 30 }),
    ]);
    if (b.error) {
      setMsg({ ok: false, texto: 'Não consegui carregar. Rode a migration 050_banners_app.sql no SQL Editor do Supabase.' });
    } else {
      // Os cartões do topo (1º carrossel) são editados em Mapa do app → Topo da Home.
      setLista(((b.data as Banner[]) || []).filter((x) => !(x.telas || []).includes('home_topo')));
    }
    const mapa: Record<string, Metrica> = {};
    for (const x of ((m.data as Metrica[]) || [])) mapa[x.banner_id] = x;
    setMetricas(mapa);
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function alternar(b: Banner) {
    const { error } = await supabase.from('banners_app').update({ ativo: !b.ativo, updated_at: new Date().toISOString() }).eq('id', b.id);
    if (error) setMsg({ ok: false, texto: 'Não foi possível alterar agora.' });
    else carregar();
  }

  async function salvar() {
    if (!editando) return;
    const e = editando;
    setMsg(null);
    if (e.tag.trim().length < 2 || e.titulo.trim().length < 3 || e.cta.trim().length < 2) {
      setMsg({ ok: false, texto: 'Preencha a etiqueta, o título e o texto do botão.' });
      return;
    }
    if (e.telas.length === 0) {
      setMsg({ ok: false, texto: 'Escolha pelo menos uma tela (Home ou Trip).' });
      return;
    }
    if (!/^(\/|https?:\/\/|aviso:|local:)/.test(e.destino.trim())) {
      setMsg({ ok: false, texto: 'O destino precisa começar com / (tela do app), https:// (site), local: (ID de um local) ou aviso:brasil2027.' });
      return;
    }
    if (e.logo_url && !/^https:\/\//.test(e.logo_url.trim())) {
      setMsg({ ok: false, texto: 'O endereço do logo precisa começar com https://.' });
      return;
    }
    setSalvando(true);
    const dados = {
      tag: e.tag.trim(), titulo: e.titulo.trim(), cta: e.cta.trim(), icone: e.icone, cor: e.cor,
      logo_url: e.logo_url?.trim() || null, destino: e.destino.trim(), telas: e.telas, parceria: e.parceria,
      peso: e.peso, peso_periodo: e.peso_periodo, periodo_inicio: e.periodo_inicio || null, periodo_fim: e.periodo_fim || null,
      inicio: e.inicio, fim: e.fim, ativo: e.ativo, traducoes: e.traducoes || {}, updated_at: new Date().toISOString(),
    };
    const r = e.id
      ? await supabase.from('banners_app').update(dados).eq('id', e.id)
      : await supabase.from('banners_app').insert({ ...dados, chave: e.chave || null });
    setSalvando(false);
    if (r.error) {
      setMsg({ ok: false, texto: 'Não foi possível salvar. Confira os campos e tente de novo.' });
      return;
    }
    setEditando(null);
    setMsg({ ok: true, texto: 'Banner salvo.' });
    carregar();
  }

  const campo = 'w-full bg-[#12121A] border border-[#232230] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#626274] focus:outline-none focus:border-[#E1306C]';
  const set = (p: Partial<Banner>) => setEditando((x) => (x ? { ...x, ...p } : x));
  const setTr = (lang: 'en' | 'es', k: 'tag' | 'titulo' | 'cta', v: string) =>
    setEditando((x) => (x ? { ...x, traducoes: { ...(x.traducoes || {}), [lang]: { ...((x.traducoes || {})[lang] || {}), [k]: v } } } : x));

  if (editando) {
    const e = editando;
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-bold">{e.id ? 'Editar banner' : 'Novo banner'}</h2>

          <div>
            <label className="text-xs font-bold text-[#A0A0B2]">Quem é o parceiro?</label>
            <div className="grid gap-2 mt-2">
              {PARCERIAS.map((p) => (
                <button key={p.v} type="button" onClick={() => set({ parceria: p.v })}
                  className={`text-left rounded-xl border px-3 py-2.5 transition ${e.parceria === p.v ? 'border-[#E1306C] bg-[#E1306C]/10' : 'border-[#232230] hover:border-[#3a3950]'}`}>
                  <span className="block text-sm font-bold">{p.rotulo}</span>
                  <span className="block text-[11px] text-[#A0A0B2]">{p.dica}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#A0A0B2]">Etiqueta pequena (acima do título)</label>
            <input className={`${campo} mt-1.5`} maxLength={60} value={e.tag} onChange={(x) => set({ tag: x.target.value })} placeholder="Ex.: APOIO CULTURAL · MUSEU DA DIVERSIDADE SEXUAL" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#A0A0B2]">Título ({e.titulo.length}/90)</label>
            <textarea className={`${campo} mt-1.5 h-20`} maxLength={90} value={e.titulo} onChange={(x) => set({ titulo: x.target.value })} placeholder="Ex.: Viaje pela história LGBT+ de São Paulo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Texto do botão</label>
              <input className={`${campo} mt-1.5`} maxLength={24} value={e.cta} onChange={(x) => set({ cta: x.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Cor da faixa lateral</label>
              <input type="color" className="mt-1.5 h-[42px] w-full bg-[#12121A] border border-[#232230] rounded-xl p-1" value={e.cor} onChange={(x) => set({ cor: x.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Ícone (se não tiver logo)</label>
              <select className={`${campo} mt-1.5`} value={e.icone} onChange={(x) => set({ icone: x.target.value })}>
                {ICONES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Logo do parceiro (opcional)</label>
              <div className="flex items-center gap-3 mt-2">
                <label className="text-xs font-bold text-[#E1306C] cursor-pointer hover:underline">
                  {enviandoLogo ? 'Enviando...' : e.logo_url ? 'Trocar logo' : 'Subir logo'}
                  <input type="file" accept="image/*" className="hidden" disabled={enviandoLogo} onChange={(x) => { subirLogo(x.target.files?.[0]); x.target.value = ''; }} />
                </label>
                {e.logo_url && <button type="button" onClick={() => set({ logo_url: null })} className="text-xs font-bold text-[#A0A0B2] hover:underline">Tirar</button>}
              </div>
              <p className="text-[11px] text-[#626274] mt-1">Fica no quadrado branco da faixa colorida, à direita. Use o logo com fundo branco ou transparente.</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#A0A0B2]">Ao tocar, abrir</label>
            <input className={`${campo} mt-1.5`} value={e.destino} onChange={(x) => set({ destino: x.target.value })} placeholder="https://museudadiversidadesexual.org.br  ou  /roteiros  ou  local:ID-do-local" />
            <p className="text-[11px] text-[#626274] mt-1">Site: https://… · Tela do app: /roteiros, /(tabs)/events · Local do app: local:ID · Aviso Brasil 2027: aviso:brasil2027</p>
          </div>

          <div>
            <label className="text-xs font-bold text-[#A0A0B2]">Onde aparece</label>
            <p className="text-[11px] text-[#626274] mt-0.5">Nas categorias, o cartão entra no carrossel do topo, depois dos banners de Fundador e Premium.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2">
              {TELAS_BANNER.map((t) => (
                <label key={t.v} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={e.telas.includes(t.v)} onChange={(x) => set({ telas: x.target.checked ? [...e.telas, t.v] : e.telas.filter((y) => y !== t.v) })} />
                  {t.rotulo}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Chance de abrir primeiro (1 a 10)</label>
              <input type="number" min={1} max={10} className={`${campo} mt-1.5`} value={e.peso} onChange={(x) => set({ peso: Math.min(10, Math.max(1, Number(x.target.value) || 1)) })} />
              <p className="text-[11px] text-[#626274] mt-1">Todos aparecem; a chance só muda quem vem primeiro. Chance 2 abre na frente o dobro de vezes que chance 1.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Chance maior num período (opcional)</label>
              <input type="number" min={1} max={10} className={`${campo} mt-1.5`} value={e.peso_periodo ?? ''} onChange={(x) => set({ peso_periodo: x.target.value ? Math.min(10, Math.max(1, Number(x.target.value))) : null })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input type="date" className={campo} value={e.periodo_inicio || ''} onChange={(x) => set({ periodo_inicio: x.target.value || null })} />
                <input type="date" className={campo} value={e.periodo_fim || ''} onChange={(x) => set({ periodo_fim: x.target.value || null })} />
              </div>
              <p className="text-[11px] text-[#626274] mt-1">Ex.: Copa com peso 3 de 25/05 a 25/07/2027.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Começa a aparecer em (opcional)</label>
              <input type="datetime-local" className={`${campo} mt-1.5`} value={paraInput(e.inicio)} onChange={(x) => set({ inicio: daInput(x.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-bold text-[#A0A0B2]">Deixa de aparecer em (opcional)</label>
              <input type="datetime-local" className={`${campo} mt-1.5`} value={paraInput(e.fim)} onChange={(x) => set({ fim: daInput(x.target.value) })} />
            </div>
          </div>

          <details className="rounded-xl border border-[#232230] p-3">
            <summary className="text-xs font-bold text-[#A0A0B2] cursor-pointer">Traduções em inglês e espanhol (opcional)</summary>
            {(['en', 'es'] as const).map((lang) => (
              <div key={lang} className="grid gap-2 mt-3">
                <p className="text-[11px] font-bold text-[#A0A0B2]">{lang === 'en' ? 'English' : 'Español'}</p>
                <input className={campo} placeholder="Etiqueta" value={e.traducoes?.[lang]?.tag || ''} onChange={(x) => setTr(lang, 'tag', x.target.value)} />
                <input className={campo} placeholder="Título" value={e.traducoes?.[lang]?.titulo || ''} onChange={(x) => setTr(lang, 'titulo', x.target.value)} />
                <input className={campo} placeholder="Botão" value={e.traducoes?.[lang]?.cta || ''} onChange={(x) => setTr(lang, 'cta', x.target.value)} />
              </div>
            ))}
            <p className="text-[11px] text-[#626274] mt-2">Se ficar vazio, o app usa o texto em português.</p>
          </details>

          {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-[#4CAF7D]' : 'text-red-400'}`}>{msg.texto}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={salvar} disabled={salvando} className="bg-[#E1306C] hover:bg-[#c42760] disabled:opacity-60 font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2">
              {salvando && <Loader2 size={14} className="animate-spin" />} Salvar banner
            </button>
            <button type="button" onClick={() => { setEditando(null); setMsg(null); }} className="text-sm font-semibold text-[#A0A0B2] hover:text-white px-3">Cancelar</button>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-[#A0A0B2] mb-2">Como aparece no app</p>
          <div className="rounded-2xl overflow-hidden flex bg-[#E8E0F6] text-[#0B0B0E] min-h-[112px]">
            <div className="flex-1 p-3.5 flex flex-col justify-center gap-1">
              <p className="text-[11px] font-extrabold tracking-wide text-[#7E57C2]">{e.tag || 'ETIQUETA'}</p>
              {e.parceria !== 'proprio' && <p className="text-[9px] font-extrabold tracking-wide text-[#6B6A80]">{e.parceria === 'patrocinio' ? 'APOIO' : 'PARCEIRO INSTITUCIONAL'}</p>}
              <p className="text-sm font-extrabold leading-tight">{e.titulo || 'Título do banner'}</p>
              <span className="self-start mt-1.5 bg-[#0B0B0E] text-white text-xs font-extrabold rounded-full px-3.5 py-1.5">{e.cta || 'Conhecer'}</span>
            </div>
            <div className="w-[72px] flex items-center justify-center" style={{ backgroundColor: e.cor }}>
              {e.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.logo_url} alt="" className="w-14 h-14 rounded-2xl bg-white object-contain p-1" />
              ) : (
                <span className="text-white text-[10px] font-bold">{e.icone}</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#626274] mt-2">O logo aparece num quadrado branco na faixa. Peça ao parceiro o logo com fundo transparente ou branco.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Rodada 144 — carrosséis da Home, de cima para baixo. Clicar filtra a lista. */}
      <div className="bg-[#161520] border border-[#232230] rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-bold text-[#A0A0B2] uppercase tracking-wide">Carrosséis da Home, de cima para baixo</p>
          <button type="button" onClick={() => { setMsg(null); setEditando({ ...VAZIO, telas: filtroCarrossel.startsWith('home') ? [filtroCarrossel] : VAZIO.telas }); }} className="bg-[#E1306C] hover:bg-[#c42760] font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Plus size={13} /> Novo banner
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <button type="button" onClick={() => onIrPara?.('mapa')} className="text-left rounded-lg border border-[#232230] p-2.5 hover:border-[#E1306C]/50">
            <p className="text-xs font-bold">1º · Topo</p>
            <p className="text-[10px] text-[#8888A0] mt-0.5">Cartões do topo (Museu, Trip…) + Membros Fundadores</p>
            <p className="text-[10px] font-bold text-[#E1306C] mt-1">Editar em Mapa do app →</p>
          </button>
          {([['home', '2º · Logo abaixo', 'Parceiros e campanhas'], ['home_c3', '3º · Abaixo das caixas', 'Aparece quando tiver banner'], ['home_c4', '4º · Fim da Home', 'Antes dos Membros Fundadores']] as const).map(([v, n, d]) => {
            const qtd = lista.filter((x) => x.telas.includes(v)).length;
            return (
              <button key={v} type="button" onClick={() => setFiltroCarrossel(filtroCarrossel === v ? 'todos' : v)} className={`text-left rounded-lg border p-2.5 transition ${filtroCarrossel === v ? 'border-[#E1306C] bg-[#E1306C]/10' : 'border-[#232230] hover:border-[#E1306C]/50'}`}>
                <p className="text-xs font-bold">{n} <span className="text-[#8888A0] font-semibold">({qtd})</span></p>
                <p className="text-[10px] text-[#8888A0] mt-0.5">{qtd === 0 ? 'Vazio: não aparece no app' : d}</p>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[#626274] mt-2">
          Os mesmos banners podem ir para a aba Trip e para o carrossel das categorias (marque em &quot;Onde aparece&quot;). Banner dos Fundadores: <button type="button" onClick={() => onIrPara?.('fundador')} className="text-[#E1306C] font-bold">Membros Fundadores</button>. Faixa fixa de categoria: <button type="button" onClick={() => onIrPara?.('categorias')} className="text-[#E1306C] font-bold">Categorias e vagas</button>. Chance 2 abre na frente o dobro de vezes que chance 1.
        </p>
      </div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {([['todos', 'Todos'], ['home', '2º carrossel'], ['home_c3', '3º carrossel'], ['home_c4', '4º carrossel'], ['trip', 'Aba Trip'], ['cat', 'Categorias']] as const).map(([v, r]) => (
          <button key={v} type="button" onClick={() => setFiltroCarrossel(v)} className={`text-[11px] font-bold px-3 py-1 rounded-full border ${filtroCarrossel === v ? 'bg-[#E1306C] border-[#E1306C] text-white' : 'border-[#232230] text-[#A0A0B2] hover:text-white'}`}>{r}</button>
        ))}
      </div>
      {msg && <p role="alert" className={`text-sm mb-3 ${msg.ok ? 'text-[#4CAF7D]' : 'text-red-400'}`}>{msg.texto}</p>}
      {carregando && <Loader2 className="animate-spin text-[#A0A0B2]" />}
      <div className="grid gap-3">
        {lista.filter((b) => filtroCarrossel === 'todos' || (filtroCarrossel === 'cat' ? b.telas.some((t) => t.startsWith('cat:')) : b.telas.includes(filtroCarrossel))).map((b) => {
          const st = estado(b);
          const m = metricas[b.id];
          const ctr = m && m.exibicoes > 0 ? ((m.cliques / m.exibicoes) * 100).toFixed(1) : '—';
          return (
            <div key={b.id} className="bg-[#161520] border border-[#232230] rounded-2xl p-4 flex gap-4 items-stretch">
              <div className="w-1.5 rounded-full shrink-0" style={{ backgroundColor: b.cor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cor}`}>{st.texto}</span>
                  <span className="text-[10px] font-bold text-[#A0A0B2]">{b.telas.map(rotuloTela).join(' · ')}</span>
                  <span className="text-[10px] text-[#626274]">· {PARCERIAS.find((p) => p.v === b.parceria)?.rotulo}</span>
                </div>
                <p className="text-[11px] font-bold text-[#B39DDB] mt-1.5 truncate">{b.tag}</p>
                <p className="text-sm font-bold leading-snug">{b.titulo}</p>
                <p className="text-[11px] text-[#A0A0B2] mt-1.5">
                  Chance {b.peso}{b.peso_periodo ? ` (${b.peso_periodo} de ${b.periodo_inicio?.split('-').reverse().join('/')} a ${b.periodo_fim?.split('-').reverse().join('/')})` : ''}
                  {b.fim ? ` · até ${new Date(b.fim).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0 text-xs text-[#A0A0B2]">
                <p className="text-[10px] uppercase tracking-wider text-[#626274]">30 dias</p>
                <p><b className="text-white">{m?.exibicoes ?? 0}</b> exibições</p>
                <p><b className="text-white">{m?.cliques ?? 0}</b> cliques · {ctr}{ctr === '—' ? '' : '%'}</p>
                <div className="flex gap-2 justify-end mt-2">
                  <button type="button" onClick={() => alternar(b)} className="border border-[#232230] hover:bg-[#1D1C29] rounded-lg px-2.5 py-1.5 flex items-center gap-1 font-semibold" title={b.ativo ? 'Pausar' : 'Reativar'}>
                    {b.ativo ? <Pause size={12} /> : <Play size={12} />} {b.ativo ? 'Pausar' : 'Reativar'}
                  </button>
                  <button type="button" onClick={() => { setMsg(null); setEditando(b); }} className="border border-[#232230] hover:bg-[#1D1C29] rounded-lg px-2.5 py-1.5 flex items-center gap-1 font-semibold">
                    <Pencil size={12} /> Editar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!carregando && lista.length === 0 && <p className="text-sm text-[#626274]">Nenhum banner ainda. Rode a migration 050 e clique em "Novo banner".</p>}
      </div>
    </div>
  );
}
