'use client';
// Rodada 65 — aba "Destinos" do /admin: as cidades do Dicas Trip
// (tabela `destinos`, migrations 036 e 038). Aqui a equipe sobe a foto de
// capa, edita frase, tags, melhor época e roteiro em destaque, cadastra
// cidades novas, ativa/desativa e muda a ordem — sem mexer no Supabase.
//
// Direitos das fotos: usar só fotos próprias, de parceiros com autorização,
// de bancos com uso comercial liberado (Unsplash, Pexels) ou de bancos
// oficiais de turismo (Embratur, secretarias) — e sempre preencher o crédito.
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Eye, EyeOff, ImagePlus, Loader2, MapPin, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GRUPOS_DESTINO, slugTag } from '../lib/taxonomia';
import { erroFotoNaoSuportada } from '../lib/validarFoto';

type Destino = {
  slug: string;
  cidade: string;
  uf: string;
  vibe: string | null;
  descricao: string | null;
  foto_url: string | null;
  foto_credito: string | null;
  tags: string[];
  melhor_epoca: string[];
  melhor_epoca_texto: string | null;
  roteiro_titulo: string | null;
  roteiro_resumo: string | null;
  roteiro_link: string | null;
  ordem: number;
  ativo: boolean;
};

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const LIMITE_FOTO_MB = 8;

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
        on ? 'bg-purple-600 border-purple-600 text-white' : 'border-[#232230] text-[#A0A0B2] hover:border-purple-500/50'
      }`}
    >
      {children}
    </button>
  );
}

const alternar = (l: string[], v: string) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

export default function PainelDestinos() {
  const [lista, setLista] = useState<Destino[] | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<Destino | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [nova, setNova] = useState({ cidade: '', uf: 'SP', vibe: '' });

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('destinos').select('*').order('ordem').order('cidade');
    if (error) {
      setErro('A tabela de destinos ainda não existe. Rode as migrations 036 e 038 no Supabase.');
      setLista([]);
      return;
    }
    setLista(((data as Destino[]) || []).map((d) => ({ ...d, tags: d.tags || [], melhor_epoca: d.melhor_epoca || [] })));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrir = (d: Destino) => {
    if (aberto === d.slug) {
      setAberto(null);
      setEditando(null);
      return;
    }
    setAberto(d.slug);
    setEditando({ ...d });
    setAviso('');
    setErro('');
  };

  const salvar = async () => {
    if (!editando) return;
    setSalvando(true);
    setErro('');
    const { slug, ...campos } = editando;
    const { error } = await supabase.from('destinos').update(campos).eq('slug', slug);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setAviso(`${editando.cidade} salvo — já aparece no app.`);
    await carregar();
  };

  const subirFoto = async (arquivo: File | undefined) => {
    if (!arquivo || !editando) return;
    const erroFormato = erroFotoNaoSuportada(arquivo);
    if (erroFormato) {
      setErro(erroFormato);
      return;
    }
    if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
      setErro(`A foto passa de ${LIMITE_FOTO_MB} MB. Reduza e tente de novo.`);
      return;
    }
    setEnviandoFoto(true);
    setErro('');
    const ext = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${editando.slug}/capa-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fotos-destinos').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    setEnviandoFoto(false);
    if (error) {
      setErro(`Não deu pra enviar a foto: ${error.message}`);
      return;
    }
    const url = supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl;
    setEditando({ ...editando, foto_url: url });
    setAviso('Foto enviada. Preencha o crédito e clique em Salvar.');
  };

  const mover = async (d: Destino, direcao: -1 | 1) => {
    if (!lista) return;
    const i = lista.findIndex((x) => x.slug === d.slug);
    const j = i + direcao;
    if (j < 0 || j >= lista.length) return;
    const nova = [...lista];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setLista(nova);
    await Promise.all(nova.map((x, idx) => supabase.from('destinos').update({ ordem: idx + 1 }).eq('slug', x.slug)));
    carregar();
  };

  const alternarAtivo = async (d: Destino) => {
    await supabase.from('destinos').update({ ativo: !d.ativo }).eq('slug', d.slug);
    carregar();
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cidade = nova.cidade.trim();
    if (!cidade) return;
    const slug = slugTag(cidade).replace(/_/g, '-');
    setErro('');
    const { error } = await supabase.from('destinos').insert({
      slug,
      cidade,
      uf: nova.uf,
      vibe: nova.vibe.trim() || null,
      ordem: (lista?.length || 0) + 1,
      ativo: false,
    });
    if (error) {
      setErro(error.code === '23505' ? 'Essa cidade já está cadastrada.' : error.message);
      return;
    }
    setNova({ cidade: '', uf: nova.uf, vibe: '' });
    setAviso(`${cidade} criada como rascunho (oculta no app). Complete foto e textos e clique no olho para publicar.`);
    await carregar();
    setAberto(slug);
  };

  useEffect(() => {
    if (aberto && lista && (!editando || editando.slug !== aberto)) {
      const d = lista.find((x) => x.slug === aberto);
      if (d) setEditando({ ...d });
    }
  }, [aberto, lista, editando]);

  if (lista === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-[#E1306C]" size={24} />
      </div>
    );
  }

  const ufs = Array.from(new Set(lista.map((d) => d.uf)));
  const grupoGerais = GRUPOS_DESTINO.find((g) => g.id === 'gerais')!;
  const grupoEpoca = GRUPOS_DESTINO.find((g) => g.id === 'melhor_epoca')!;

  return (
    <div className="space-y-6">
      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">{erro}</div>}
      {aviso && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-xs">{aviso}</div>}

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-4 text-xs text-[#A0A0B2] leading-relaxed">
        <b className="text-white">Fotos:</b> use só fotos próprias, de parceiros com autorização, de bancos com uso comercial liberado (Unsplash, Pexels) ou de bancos
        oficiais de turismo (Embratur, secretarias municipais) — e sempre preencha o crédito. Ideal: horizontal, 1600 px de largura ou mais, JPG até {LIMITE_FOTO_MB} MB.
        <span className="block mt-1">
          {lista.length} cidade(s) em {ufs.length} estado(s).{' '}
          {ufs.length >= 3 ? 'No app, o Trip já mostra filtro por estado.' : 'Com 3 estados ou mais, o Trip passa a mostrar filtro por estado.'}
        </span>
      </div>

      {/* Nova cidade */}
      <form onSubmit={criar} className="bg-[#161520] border border-[#232230] rounded-2xl p-4 grid md:grid-cols-[1fr_90px_1.4fr_auto] gap-3 items-end">
        <div>
          <label className={label}>Nova cidade</label>
          <input className={input} value={nova.cidade} onChange={(e) => setNova({ ...nova, cidade: e.target.value })} placeholder="Florianópolis" required />
        </div>
        <div>
          <label className={label}>UF</label>
          <select className={input} value={nova.uf} onChange={(e) => setNova({ ...nova, uf: e.target.value })}>
            {UFS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Frase</label>
          <input className={input} value={nova.vibe} onChange={(e) => setNova({ ...nova, vibe: e.target.value })} placeholder="Praias e experiências" />
        </div>
        <button type="submit" className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-1 justify-center">
          <Plus size={14} /> Adicionar
        </button>
      </form>

      {/* Lista */}
      <div className="space-y-3">
        {lista.map((d, idx) => {
          const estaAberto = aberto === d.slug && editando?.slug === d.slug;
          const e = estaAberto ? editando! : d;
          const pendencias = [!d.foto_url && 'sem foto', d.foto_url && !d.foto_credito && 'sem crédito da foto', !d.vibe && 'sem frase', d.tags.length === 0 && 'sem tags'].filter(Boolean);
          return (
            <div key={d.slug} className={`bg-[#161520] border rounded-2xl overflow-hidden ${d.ativo ? 'border-[#232230]' : 'border-dashed border-[#3A3850]'}`}>
              <div className="flex items-center gap-3 p-3">
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-[#21173A] flex items-center justify-center shrink-0">
                  {d.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.foto_url} alt={d.cidade} className="w-full h-full object-cover" />
                  ) : (
                    <MapPin size={18} className="text-[#E1306C]" />
                  )}
                </div>
                <button onClick={() => abrir(d)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold">
                    {d.cidade} <span className="text-[#A0A0B2] font-normal">· {d.uf}</span>
                    {!d.ativo && <span className="ml-2 text-[10px] text-[#FFD54F]">OCULTA NO APP</span>}
                  </p>
                  <p className="text-[11px] text-[#A0A0B2] truncate">{d.vibe || '—'}</p>
                  {pendencias.length > 0 && <p className="text-[10px] text-[#FF8FB1] mt-0.5">{pendencias.join(' · ')}</p>}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => mover(d, -1)} disabled={idx === 0} className="p-2 text-[#A0A0B2] disabled:opacity-20" title="Subir">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => mover(d, 1)} disabled={idx === lista.length - 1} className="p-2 text-[#A0A0B2] disabled:opacity-20" title="Descer">
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={() => alternarAtivo(d)} className="p-2" title={d.ativo ? 'Ocultar do app' : 'Publicar no app'}>
                    {d.ativo ? <Eye size={15} className="text-[#4CAF7D]" /> : <EyeOff size={15} className="text-[#626274]" />}
                  </button>
                  <button onClick={() => abrir(d)} className="p-2 text-[#A0A0B2]">
                    {estaAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {estaAberto && (
                <div className="border-t border-[#232230] p-4 space-y-5">
                  {/* Foto */}
                  <div className="grid md:grid-cols-[320px_1fr] gap-4">
                    <label className="relative h-44 rounded-xl overflow-hidden border border-dashed border-[#3A3850] cursor-pointer hover:border-[#E1306C]/60 bg-[#21173A] flex items-center justify-center">
                      {e.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.foto_url} alt={e.cidade} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-[#A0A0B2] flex flex-col items-center gap-2">
                          <ImagePlus size={22} /> Escolher foto de capa
                        </span>
                      )}
                      {enviandoFoto && (
                        <span className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="animate-spin" size={22} />
                        </span>
                      )}
                      {e.foto_url && !enviandoFoto && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-[11px] px-2 py-1 rounded-lg">Trocar foto</span>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(ev) => subirFoto(ev.target.files?.[0])} />
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className={label}>Crédito da foto</label>
                        <input className={input} value={e.foto_credito || ''} onChange={(ev) => setEditando({ ...e, foto_credito: ev.target.value })} placeholder="Foto: Embratur / Unsplash – Nome do autor" />
                      </div>
                      <div className="grid grid-cols-[1fr_90px] gap-3">
                        <div>
                          <label className={label}>Cidade</label>
                          <input className={input} value={e.cidade} onChange={(ev) => setEditando({ ...e, cidade: ev.target.value })} />
                        </div>
                        <div>
                          <label className={label}>UF</label>
                          <select className={input} value={e.uf} onChange={(ev) => setEditando({ ...e, uf: ev.target.value })}>
                            {UFS.map((u) => (
                              <option key={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={label}>Frase (aparece no card)</label>
                        <input className={input} value={e.vibe || ''} onChange={(ev) => setEditando({ ...e, vibe: ev.target.value })} placeholder="Verão, praia e muito sol" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={label}>Descrição (topo da página da cidade)</label>
                    <textarea className={input} rows={3} value={e.descricao || ''} onChange={(ev) => setEditando({ ...e, descricao: ev.target.value })} placeholder="O que faz essa cidade especial para a comunidade LGBT+…" />
                  </div>

                  <div>
                    <label className={label}>Tags do destino</label>
                    <div className="flex flex-wrap gap-1.5">
                      {grupoGerais.tags.map((t) => (
                        <Chip key={t} on={e.tags.includes(slugTag(t))} onClick={() => setEditando({ ...e, tags: alternar(e.tags, slugTag(t)) })}>
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={label}>Melhor época</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {grupoEpoca.tags.map((t) => (
                        <Chip key={t} on={e.melhor_epoca.includes(slugTag(t))} onClick={() => setEditando({ ...e, melhor_epoca: alternar(e.melhor_epoca, slugTag(t)) })}>
                          {t}
                        </Chip>
                      ))}
                    </div>
                    <input className={input} value={e.melhor_epoca_texto || ''} onChange={(ev) => setEditando({ ...e, melhor_epoca_texto: ev.target.value })} placeholder="Ex.: Setembro a março — clima perfeito para praias e festas" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Roteiro em destaque — título</label>
                      <input className={input} value={e.roteiro_titulo || ''} onChange={(ev) => setEditando({ ...e, roteiro_titulo: ev.target.value })} placeholder="Rio em 3 dias" />
                    </div>
                    <div>
                      <label className={label}>Link do roteiro (site/blog)</label>
                      <input className={input} value={e.roteiro_link || ''} onChange={(ev) => setEditando({ ...e, roteiro_link: ev.target.value })} placeholder="https://www.dicaslgbt.com.br/roteiros/rio-3-dias" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={label}>Resumo do roteiro</label>
                      <input className={input} value={e.roteiro_resumo || ''} onChange={(ev) => setEditando({ ...e, roteiro_resumo: ev.target.value })} placeholder="Praias icônicas, vida noturna, cultura e experiências LGBT+." />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button onClick={() => abrir(d)} className="text-xs text-[#A0A0B2] px-4 py-2.5">Fechar</button>
                    <button onClick={salvar} disabled={salvando || enviandoFoto} className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1">
                      <Check size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
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
