'use client';
// Rodada 69 — aba "Roteiros" do /admin: roteiros completos e experiências
// do Dicas Trip (tabelas roteiros / roteiro_paradas, migration 039).
// A equipe cria o roteiro (nasce como rascunho), sobe a foto, marca as tags
// da taxonomia oficial, escolhe até 8 tags principais (as que aparecem nos
// cards), monta as paradas da linha do tempo e publica.
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Eye, EyeOff, ImagePlus, Loader2, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { buscarCoordenadas } from '../lib/geocodificar';
import { supabase } from '../lib/supabase';
import { GRUPOS_ROTEIRO, ROTEIRO_MAX_TAGS_VISIVEIS, rotuloTag, slugTag } from '../lib/taxonomia';
import { erroFotoNaoSuportada } from '../lib/validarFoto';

type Roteiro = {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  cidade: string;
  uf: string | null;
  destino_slug: string | null;
  foto_url: string | null;
  foto_credito: string | null;
  formato: string;
  duracao: string | null;
  duracao_texto: string | null;
  preco_texto: string | null;
  link_reserva: string | null;
  tags: Record<string, string[]>;
  tags_principais: string[];
  status: string;
  destaque: boolean;
  ordem: number;
};
type Parada = {
  id: string;
  roteiro_id: string;
  ordem: number;
  horario: string | null;
  titulo: string;
  descricao: string | null;
  foto_url: string | null;
  local_id: string | null;
  endereco: string | null;
  lat: number | null;
  lng: number | null;
};
type Destino = { slug: string; cidade: string; uf: string };

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const alternar = (l: string[], v: string) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

async function subirFoto(pasta: string, arquivo: File): Promise<string> {
  const erro = erroFotoNaoSuportada(arquivo);
  if (erro) throw new Error(erro);
  if (arquivo.size > 8 * 1024 * 1024) throw new Error('A foto passa de 8 MB.');
  const ext = arquivo.name.split('.').pop() || 'jpg';
  const caminho = `roteiros/${pasta}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('fotos-destinos').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl;
}

export default function PainelRoteiros() {
  const [lista, setLista] = useState<Roteiro[] | null>(null);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [ed, setEd] = useState<Roteiro | null>(null);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [locaisCidade, setLocaisCidade] = useState<{ id: string; nome: string }[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [nova, setNova] = useState({ titulo: '', cidade: '', formato: 'roteiro_completo' });

  const carregar = useCallback(async () => {
    const [r, d] = await Promise.all([
      supabase.from('roteiros').select('*').order('destaque', { ascending: false }).order('ordem').order('created_at', { ascending: false }),
      supabase.from('destinos').select('slug, cidade, uf').order('ordem'),
    ]);
    if (r.error) {
      setErro('A tabela de roteiros ainda não existe. Rode a migration 039 no Supabase.');
      setLista([]);
      return;
    }
    setLista(((r.data as Roteiro[]) || []).map((x) => ({ ...x, tags: x.tags || {}, tags_principais: x.tags_principais || [] })));
    setDestinos((d.data as Destino[]) || []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const carregarParadas = async (id: string) => {
    const { data } = await supabase.from('roteiro_paradas').select('*').eq('roteiro_id', id).order('ordem');
    setParadas((data as Parada[]) || []);
  };

  const abrir = async (r: Roteiro) => {
    setErro('');
    setAviso('');
    if (aberto === r.id) {
      setAberto(null);
      setEd(null);
      return;
    }
    setAberto(r.id);
    setEd({ ...r });
    await carregarParadas(r.id);
    const { data } = await supabase.from('locais').select('id, nome').eq('status', 'aprovado').eq('cidade', r.cidade).order('nome').limit(300);
    setLocaisCidade((data as { id: string; nome: string }[]) || []);
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = nova.titulo.trim();
    const cidade = nova.cidade.trim();
    if (!titulo || !cidade) return;
    const dest = destinos.find((d) => d.cidade === cidade);
    const slug = `${slugTag(titulo).replace(/_/g, '-')}-${Date.now().toString(36).slice(-4)}`;
    const { data, error } = await supabase
      .from('roteiros')
      .insert({ slug, titulo, cidade, uf: dest?.uf || null, destino_slug: dest?.slug || null, formato: nova.formato, tags: { formato: [nova.formato] }, ordem: (lista?.length || 0) + 1 })
      .select('*')
      .single();
    if (error) {
      setErro(error.message);
      return;
    }
    setNova({ ...nova, titulo: '' });
    setAviso('Roteiro criado como rascunho. Complete foto, tags e paradas e clique no olho para publicar.');
    await carregar();
    abrir({ ...(data as Roteiro), tags: (data as Roteiro).tags || {}, tags_principais: [] });
  };

  const salvar = async () => {
    if (!ed) return;
    setSalvando(true);
    setErro('');
    const { id, ...campos } = ed;
    const dest = destinos.find((d) => d.cidade === ed.cidade);
    const { error } = await supabase
      .from('roteiros')
      .update({ ...campos, destino_slug: dest?.slug || ed.destino_slug, uf: ed.uf || dest?.uf || null, duracao: (ed.tags.duracao || [])[0] || ed.duracao, formato: (ed.tags.formato || [])[0] || ed.formato })
      .eq('id', id);
    setSalvando(false);
    if (error) setErro(error.message);
    else {
      setAviso(`"${ed.titulo}" salvo.`);
      carregar();
    }
  };

  const alternarTag = (grupo: string, slug: string) => {
    if (!ed) return;
    const novas = alternar(ed.tags[grupo] || [], slug);
    const tags = { ...ed.tags, [grupo]: novas };
    const todas = new Set(Object.values(tags).flat());
    setEd({ ...ed, tags, tags_principais: ed.tags_principais.filter((t) => todas.has(t)) });
  };

  const alternarPrincipal = (slug: string) => {
    if (!ed) return;
    const on = ed.tags_principais.includes(slug);
    if (!on && ed.tags_principais.length >= ROTEIRO_MAX_TAGS_VISIVEIS) {
      setErro(`Máximo de ${ROTEIRO_MAX_TAGS_VISIVEIS} tags principais. Desmarque uma antes.`);
      return;
    }
    setErro('');
    setEd({ ...ed, tags_principais: on ? ed.tags_principais.filter((t) => t !== slug) : [...ed.tags_principais, slug] });
  };

  const fotoCapa = async (f: File | undefined) => {
    if (!f || !ed) return;
    setEnviando(true);
    try {
      setEd({ ...ed, foto_url: await subirFoto(ed.slug, f) });
      setAviso('Foto enviada. Preencha o crédito e salve.');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar foto.');
    } finally {
      setEnviando(false);
    }
  };

  const alternarPublicado = async (r: Roteiro) => {
    await supabase.from('roteiros').update({ status: r.status === 'publicado' ? 'rascunho' : 'publicado' }).eq('id', r.id);
    carregar();
  };
  const alternarDestaque = async (r: Roteiro) => {
    await supabase.from('roteiros').update({ destaque: !r.destaque }).eq('id', r.id);
    carregar();
  };
  const mover = async (r: Roteiro, dir: -1 | 1) => {
    if (!lista) return;
    const i = lista.findIndex((x) => x.id === r.id);
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const nova = [...lista];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setLista(nova);
    await Promise.all(nova.map((x, idx) => supabase.from('roteiros').update({ ordem: idx + 1 }).eq('id', x.id)));
  };
  const apagar = async (r: Roteiro) => {
    if (!confirm(`Apagar "${r.titulo}" e todas as paradas?`)) return;
    await supabase.from('roteiros').delete().eq('id', r.id);
    setAberto(null);
    setEd(null);
    carregar();
  };

  // Paradas
  const novaParada = async () => {
    if (!ed) return;
    const { error } = await supabase.from('roteiro_paradas').insert({ roteiro_id: ed.id, ordem: paradas.length + 1, titulo: 'Nova parada' });
    if (error) setErro(error.message);
    await carregarParadas(ed.id);
  };
  const salvarParada = async (p: Parada) => {
    const { id, ...campos } = p;
    const { error } = await supabase.from('roteiro_paradas').update(campos).eq('id', id);
    if (error) setErro(error.message);
    else setAviso(`Parada "${p.titulo}" salva.`);
  };
  const localizarParada = async (p: Parada) => {
    if (!ed) return;
    const coord = await buscarCoordenadas([p.endereco || p.titulo, ed.cidade].filter(Boolean).join(', '));
    if (!coord) {
      setErro('Não achamos esse endereço no mapa. Escreva rua e número ou cole lat, lng no campo de coordenadas.');
      return;
    }
    const atual = { ...p, lat: coord.lat, lng: coord.lng };
    setParadas((ps) => ps.map((x) => (x.id === p.id ? atual : x)));
    await salvarParada(atual);
  };
  const fotoParada = async (p: Parada, f: File | undefined) => {
    if (!f || !ed) return;
    setEnviando(true);
    try {
      const atual = { ...p, foto_url: await subirFoto(`${ed.slug}/paradas`, f) };
      setParadas((ps) => ps.map((x) => (x.id === p.id ? atual : x)));
      await salvarParada(atual);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar foto.');
    } finally {
      setEnviando(false);
    }
  };
  const moverParada = async (p: Parada, dir: -1 | 1) => {
    const i = paradas.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= paradas.length) return;
    const nova = [...paradas];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setParadas(nova.map((x, idx) => ({ ...x, ordem: idx + 1 })));
    await Promise.all(nova.map((x, idx) => supabase.from('roteiro_paradas').update({ ordem: idx + 1 }).eq('id', x.id)));
  };
  const apagarParada = async (p: Parada) => {
    await supabase.from('roteiro_paradas').delete().eq('id', p.id);
    if (ed) carregarParadas(ed.id);
  };
  const setParada = (id: string, campos: Partial<Parada>) => setParadas((ps) => ps.map((x) => (x.id === id ? { ...x, ...campos } : x)));

  if (lista === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-[#E1306C]" size={24} />
      </div>
    );
  }

  const cidadesOpcoes = Array.from(new Set(destinos.map((d) => d.cidade)));

  return (
    <div className="space-y-6">
      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">{erro}</div>}
      {aviso && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-xs">{aviso}</div>}

      <form onSubmit={criar} className="bg-[#161520] border border-[#232230] rounded-2xl p-4 grid md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className={label}>Novo roteiro / experiência</label>
          <input className={input} value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} placeholder="Rio LGBT+ em 3 dias" required />
        </div>
        <div>
          <label className={label}>Cidade</label>
          <input className={input} list="cidades-roteiro" value={nova.cidade} onChange={(e) => setNova({ ...nova, cidade: e.target.value })} placeholder="São Paulo" required />
          <datalist id="cidades-roteiro">
            {cidadesOpcoes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={label}>Formato</label>
          <select className={input} value={nova.formato} onChange={(e) => setNova({ ...nova, formato: e.target.value })}>
            {GRUPOS_ROTEIRO.find((g) => g.id === 'formato')!.tags.map((t) => (
              <option key={t} value={slugTag(t)}>{t}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-1 justify-center">
          <Plus size={14} /> Criar
        </button>
      </form>

      <div className="space-y-3">
        {lista.length === 0 && <p className="text-xs text-[#626274]">Nenhum roteiro cadastrado ainda.</p>}
        {lista.map((r, idx) => {
          const estaAberto = aberto === r.id && ed?.id === r.id;
          return (
            <div key={r.id} className={`bg-[#161520] border rounded-2xl overflow-hidden ${r.status === 'publicado' ? 'border-[#232230]' : 'border-dashed border-[#3A3850]'}`}>
              <div className="flex items-center gap-3 p-3">
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-[#21173A] flex items-center justify-center shrink-0">
                  {r.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MapPin size={18} className="text-[#E1306C]" />
                  )}
                </div>
                <button onClick={() => abrir(r)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold truncate">
                    {r.titulo}
                    {r.destaque && <span className="ml-2 text-[10px] text-[#FFD54F]">★ DESTAQUE</span>}
                    {r.status !== 'publicado' && <span className="ml-2 text-[10px] text-[#FFD54F]">RASCUNHO</span>}
                  </p>
                  <p className="text-[11px] text-[#A0A0B2] truncate">
                    {rotuloTag(r.formato)} · {r.cidade} · {r.tags_principais.length}/{ROTEIRO_MAX_TAGS_VISIVEIS} tags principais
                  </p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => mover(r, -1)} disabled={idx === 0} className="p-2 text-[#A0A0B2] disabled:opacity-20" title="Subir"><ArrowUp size={14} /></button>
                  <button onClick={() => mover(r, 1)} disabled={idx === lista.length - 1} className="p-2 text-[#A0A0B2] disabled:opacity-20" title="Descer"><ArrowDown size={14} /></button>
                  <button onClick={() => alternarDestaque(r)} className="p-2" title={r.destaque ? 'Tirar do destaque' : 'Colocar em destaque'}>
                    <Star size={15} className={r.destaque ? 'text-[#FFD54F] fill-[#FFD54F]' : 'text-[#626274]'} />
                  </button>
                  <button onClick={() => alternarPublicado(r)} className="p-2" title={r.status === 'publicado' ? 'Voltar para rascunho' : 'Publicar no app'}>
                    {r.status === 'publicado' ? <Eye size={15} className="text-[#4CAF7D]" /> : <EyeOff size={15} className="text-[#626274]" />}
                  </button>
                  <button onClick={() => abrir(r)} className="p-2 text-[#A0A0B2]">{estaAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
              </div>

              {estaAberto && ed && (
                <div className="border-t border-[#232230] p-4 space-y-6">
                  {/* Dados */}
                  <div className="grid md:grid-cols-[300px_1fr] gap-4">
                    <label className="relative h-44 rounded-xl overflow-hidden border border-dashed border-[#3A3850] cursor-pointer hover:border-[#E1306C]/60 bg-[#21173A] flex items-center justify-center">
                      {ed.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ed.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-[#A0A0B2] flex flex-col items-center gap-2"><ImagePlus size={22} /> Foto de capa</span>
                      )}
                      {enviando && <span className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin" size={22} /></span>}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => fotoCapa(e.target.files?.[0])} />
                    </label>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className={label}>Título</label>
                        <input className={input} value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={label}>Frase (subtítulo)</label>
                        <input className={input} value={ed.subtitulo || ''} onChange={(e) => setEd({ ...ed, subtitulo: e.target.value })} placeholder="Cultura, gastronomia e vida noturna em 4 paradas." />
                      </div>
                      <div>
                        <label className={label}>Cidade</label>
                        <input className={input} list="cidades-roteiro" value={ed.cidade} onChange={(e) => setEd({ ...ed, cidade: e.target.value })} />
                      </div>
                      <div>
                        <label className={label}>Duração (texto do card)</label>
                        <input className={input} value={ed.duracao_texto || ''} onChange={(e) => setEd({ ...ed, duracao_texto: e.target.value })} placeholder="1 dia / 3h / 2 dias" />
                      </div>
                      <div>
                        <label className={label}>Preço (texto)</label>
                        <input className={input} value={ed.preco_texto || ''} onChange={(e) => setEd({ ...ed, preco_texto: e.target.value })} placeholder="Grátis / A partir de R$ 90" />
                      </div>
                      <div>
                        <label className={label}>Link de reserva (opcional)</label>
                        <input className={input} value={ed.link_reserva || ''} onChange={(e) => setEd({ ...ed, link_reserva: e.target.value })} placeholder="https://..." />
                      </div>
                      <div className="md:col-span-2">
                        <label className={label}>Crédito da foto</label>
                        <input className={input} value={ed.foto_credito || ''} onChange={(e) => setEd({ ...ed, foto_credito: e.target.value })} placeholder="Foto: Embratur / Unsplash – autor" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={label}>Descrição (seção “Sobre”)</label>
                    <textarea className={input} rows={3} value={ed.descricao || ''} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} />
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-sm font-bold">Tags</p>
                    <p className="text-[11px] text-[#A0A0B2] mb-3">
                      Clique para marcar. Depois clique na ★ das marcadas para escolher as até {ROTEIRO_MAX_TAGS_VISIVEIS} <b>tags principais</b> que aparecem nos cards — as demais ficam nos filtros e na página do roteiro.{' '}
                      <b className={ed.tags_principais.length >= ROTEIRO_MAX_TAGS_VISIVEIS ? 'text-[#FFD54F]' : 'text-white'}>{ed.tags_principais.length}/{ROTEIRO_MAX_TAGS_VISIVEIS} principais</b>
                    </p>
                    <div className="space-y-3">
                      {GRUPOS_ROTEIRO.map((g) => (
                        <div key={g.id}>
                          <p className="text-[11px] font-bold text-[#A0A0B2] uppercase mb-1.5">{g.titulo}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {g.tags.map((t) => {
                              const s = slugTag(t);
                              const on = (ed.tags[g.id] || []).includes(s);
                              const principal = ed.tags_principais.includes(s);
                              return (
                                <span key={s} className={`inline-flex items-center rounded-full border text-[11px] ${on ? 'bg-purple-600 border-purple-600 text-white' : 'border-[#232230] text-[#A0A0B2]'}`}>
                                  <button type="button" onClick={() => alternarTag(g.id, s)} className="px-2.5 py-1">{t}</button>
                                  {on && g.id !== 'comercial' && (
                                    <button type="button" onClick={() => alternarPrincipal(s)} className="pr-2" title="Tag principal (aparece no card)">
                                      <Star size={11} className={principal ? 'text-[#FFD54F] fill-[#FFD54F]' : 'text-white/60'} />
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between gap-2">
                    <button onClick={() => apagar(r)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={13} /> Apagar roteiro</button>
                    <button onClick={salvar} disabled={salvando || enviando} className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1">
                      <Check size={14} /> {salvando ? 'Salvando...' : 'Salvar roteiro'}
                    </button>
                  </div>

                  {/* Paradas */}
                  <div className="border-t border-[#232230] pt-5">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-sm font-bold">Paradas ({paradas.length})</p>
                        <p className="text-[11px] text-[#A0A0B2]">A linha do tempo do roteiro. Localize no mapa para o botão “Abrir no mapa” traçar o caminho.</p>
                      </div>
                      <button onClick={novaParada} className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><Plus size={13} /> Parada</button>
                    </div>
                    <div className="space-y-3">
                      {paradas.map((p, i) => (
                        <div key={p.id} className="border border-[#232230] rounded-xl p-3 grid md:grid-cols-[110px_1fr] gap-3">
                          <label className="relative h-24 rounded-lg overflow-hidden border border-dashed border-[#3A3850] cursor-pointer bg-[#0B0B0E] flex items-center justify-center">
                            {p.foto_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImagePlus size={18} className="text-[#A0A0B2]" />
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => fotoParada(p, e.target.files?.[0])} />
                          </label>
                          <div className="grid md:grid-cols-[90px_1fr] gap-2">
                            <input className={input} value={p.horario || ''} onChange={(e) => setParada(p.id, { horario: e.target.value })} placeholder="10h" />
                            <input className={input} value={p.titulo} onChange={(e) => setParada(p.id, { titulo: e.target.value })} placeholder="Avenida Paulista e MASP" />
                            <textarea className={`${input} md:col-span-2`} rows={2} value={p.descricao || ''} onChange={(e) => setParada(p.id, { descricao: e.target.value })} placeholder="O que fazer nesta parada" />
                            <div className="md:col-span-2 flex gap-2">
                              <input className={input} value={p.endereco || ''} onChange={(e) => setParada(p.id, { endereco: e.target.value })} placeholder="Endereço" />
                              <button type="button" onClick={() => localizarParada(p)} className="bg-[#232230] text-white text-xs font-bold px-3 rounded-lg whitespace-nowrap flex items-center gap-1">
                                <MapPin size={12} /> {p.lat != null ? 'Localizado ✓' : 'Localizar'}
                              </button>
                            </div>
                            <select className={`${input} md:col-span-2`} value={p.local_id || ''} onChange={(e) => setParada(p.id, { local_id: e.target.value || null })}>
                              <option value="">Vincular a um local do app (opcional)</option>
                              {locaisCidade.map((l) => (
                                <option key={l.id} value={l.id}>{l.nome}</option>
                              ))}
                            </select>
                            <div className="md:col-span-2 flex justify-between items-center">
                              <div className="flex gap-1">
                                <button onClick={() => moverParada(p, -1)} disabled={i === 0} className="p-1.5 text-[#A0A0B2] disabled:opacity-20"><ArrowUp size={13} /></button>
                                <button onClick={() => moverParada(p, 1)} disabled={i === paradas.length - 1} className="p-1.5 text-[#A0A0B2] disabled:opacity-20"><ArrowDown size={13} /></button>
                                <button onClick={() => apagarParada(p)} className="p-1.5 text-red-400"><Trash2 size={13} /></button>
                              </div>
                              <button onClick={() => salvarParada(p)} className="bg-[#7E57C2] text-white text-xs font-bold px-3 py-1.5 rounded-lg">Salvar parada</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
