'use client';
// Aba "Categorias" do /admin (nov/2026) — o jeito óbvio de mexer no que aparece no app.
// Primeiro você escolhe a categoria; dentro dela ficam, na ordem em que aparecem no app:
//   1) Patrocínio Master  → a faixa grande do topo (1 vaga; tabela categoria_patrocinio)
//   2) Banner Premium     → 12 vagas, 4 por hora (tabela vitrine_vaga, tipo premium; texto em destaque_chamada)
//   3) Subcategorias      → os ícones redondos; liga/desliga (tabela subcategoria_config)
//   4) Cupons             → 24 posições (1–10 Premium, 11–12 Fundador, 13–24 Intermediário), 6 por vez (3 + 3), Premium/Fundador avançam a cada 10 min e Intermediário a cada 30 min (vitrine_vaga, tipo intermediario)
// Vaga sem local escolhido = AUTOMÁTICA: o app preenche pelo plano do local. Escolher um local aqui manda nele.
// Migrations: 059 (patrocínio), 060 (chamada), 065 (subcategorias), 071 (vagas).
import { ArrowLeft, Check, ChevronRight, Loader2, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { erroFotoNaoSuportada } from '../lib/validarFoto';
import { SUBCATEGORIAS_APP } from '../lib/subcategoriasApp';

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const card = 'bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-6';
const botao = 'bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2';
const botaoCinza = 'bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2';

type Cat = { slug: string; nome: string; real: string | null; aberta: boolean; fundadores?: boolean };
// "aberta" = já aparece aberta na Home do app (as outras aparecem "em breve" lá, mas já podem ser preparadas aqui).
const CATS: Cat[] = [
  { slug: 'destaques', nome: 'Destaques (Fundadores)', real: null, aberta: true, fundadores: true },
  { slug: 'bares', nome: 'Bares & Vida Noturna', real: 'lugares', aberta: true },
  { slug: 'festas', nome: 'Festas & Eventos', real: null, aberta: true },
  { slug: 'servicos', nome: 'Serviços', real: 'servicos', aberta: true },
  { slug: 'turismo', nome: 'Turismo | Dicas Trip', real: 'turismo', aberta: true },
  { slug: 'artistas', nome: 'Artistas', real: 'artistas', aberta: true },
  { slug: 'beleza', nome: 'Beleza & Estética', real: 'beleza', aberta: true },
  { slug: 'mais18', nome: 'Espaços 18+', real: 'mais18', aberta: true },
  { slug: 'gastronomia', nome: 'Gastronomia', real: 'gastronomia', aberta: false },
  { slug: 'cultura', nome: 'Cultura', real: 'cultura', aberta: false },
  { slug: 'educacao', nome: 'Educação', real: 'educacao', aberta: false },
  { slug: 'produtos', nome: 'Compras & Produtos', real: 'produtos', aberta: false },
  { slug: 'lazer', nome: 'Experiências & Lazer', real: 'lazer', aberta: false },
  { slug: 'saude', nome: 'Saúde & Bem-estar', real: null, aberta: false },
  { slug: 'comunidade', nome: 'Comunidade & Apoio', real: null, aberta: false },
];

type LocalMini = { id: string; nome: string; plano_comercial: string | null; plano_comercial_status: string | null; categoria?: string | null };
type Vaga = { posicao: number; local: LocalMini };
type Patro = { local_id: string | null; tag: string; titulo: string; subtitulo: string; cta: string; destino: string; imagem_url: string; cor1: string; cor2: string; ativo: boolean };
const PATRO_VAZIO: Patro = { local_id: null, tag: 'PATROCÍNIO MASTER', titulo: '', subtitulo: '', cta: 'Saiba mais', destino: '', imagem_url: '', cor1: '#7E57C2', cor2: '#E1306C', ativo: true };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const planoPago = (l: LocalMini) => !!l.plano_comercial && l.plano_comercial !== 'freemium' && (l.plano_comercial_status ?? 'ativo') === 'ativo';
const rotuloPlano = (l: LocalMini) => (l.plano_comercial === 'fundador' ? 'Fundador' : l.plano_comercial === 'premium' ? 'Premium' : l.plano_comercial === 'intermediario' ? 'Intermediário' : l.plano_comercial === 'starter' ? 'Starter' : 'Gratuito') + (planoPago(l) || l.plano_comercial === 'freemium' ? '' : ' (não ativo)');

function BuscaLocal({ onEscolher, texto = 'Buscar local pelo nome…' }: { onEscolher: (l: LocalMini) => void; texto?: string }) {
  const [q, setQ] = useState('');
  const [achados, setAchados] = useState<LocalMini[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setAchados([]); return; }
      const { data } = await supabase.from('locais').select('id, nome, plano_comercial, plano_comercial_status, categoria').eq('status', 'aprovado').ilike('nome', `%${q.trim()}%`).limit(8);
      setAchados((data as LocalMini[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      <input className={input} placeholder={texto} value={q} onChange={(e) => setQ(e.target.value)} />
      {achados.length > 0 && (
        <div className="mt-1 bg-[#0B0B0E] border border-[#232230] rounded-xl overflow-hidden">
          {achados.map((l) => (
            <button key={l.id} onClick={() => { onEscolher(l); setQ(''); setAchados([]); }} className="w-full text-left px-3 py-2 text-xs hover:bg-[#1D1C2A] flex justify-between gap-3">
              <span className="font-bold">{l.nome}</span>
              <span className="text-[#A0A0B2]">{rotuloPlano(l)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PainelCategorias() {
  const [cat, setCat] = useState<Cat | null>(null);
  if (cat) return <DetalheCategoria cat={cat} onVoltar={() => setCat(null)} />;
  return <VisaoCategorias onAbrir={setCat} />;
}

// ============ lista de categorias ============
function VisaoCategorias({ onAbrir }: { onAbrir: (c: Cat) => void }) {
  const [resumo, setResumo] = useState<Record<string, { master: boolean; premium: number; inter: number }>>({});
  useEffect(() => {
    (async () => {
      const r: Record<string, { master: boolean; premium: number; inter: number }> = {};
      const g = (s: string) => (r[s] ||= { master: false, premium: 0, inter: 0 });
      const { data: p } = await supabase.from('categoria_patrocinio').select('categoria, ativo');
      for (const x of (p as any[]) || []) if (x.ativo) g(x.categoria).master = true;
      const { data: v } = await supabase.from('vitrine_vaga').select('categoria, tipo');
      for (const x of (v as any[]) || []) { if (x.tipo === 'premium') g(x.categoria).premium++; else g(x.categoria).inter++; }
      setResumo(r);
    })();
  }, []);
  return (
    <div>
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-4 mb-6 text-xs text-[#C9C9D6] leading-relaxed">
        <b className="text-white">Como funciona:</b> escolha uma categoria. Dentro dela você vê, na ordem em que aparecem no app, o <b>Patrocínio Master</b> (1 faixa grande), os
        <b> 12 Banners Premium</b> (rodam 4 por hora), as <b>Subcategorias</b> (ícones redondos) e os <b>24 Cupons</b> (quadradinhos: 10 Premium + 2 Fundador + 12 Intermediário; cada tela mostra 6 = 3 Premium/Fundador + 3 Intermediário; Premium/Fundador mudam a cada 10 min e Intermediário a cada 30 min).
        Vaga sem local escolhido é <b>automática</b>: o app preenche sozinho pelo plano do local.
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATS.map((c) => {
          const x = resumo[c.slug];
          return (
            <button key={c.slug} onClick={() => onAbrir(c)} className="text-left bg-[#161520] hover:bg-[#1B1A28] border border-[#232230] rounded-2xl p-4 transition">
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-sm">{c.nome}</p>
                <ChevronRight size={16} className="text-[#626274]" />
              </div>
              <p className={`text-[10px] font-bold mt-0.5 ${c.aberta ? 'text-[#4CAF7D]' : 'text-[#A0A0B2]'}`}>{c.aberta ? 'Aberta na Home do app' : 'Em breve na Home do app'}</p>
              <div className="flex flex-wrap gap-1.5 mt-3 text-[10px] font-bold">
                <span className={`px-2 py-1 rounded-md ${x?.master ? 'bg-[#4CAF7D]/15 text-[#4CAF7D]' : 'bg-[#232230] text-[#8888A0]'}`}>Master {x?.master ? '✓' : 'vazio'}</span>
                <span className="px-2 py-1 rounded-md bg-[#232230] text-[#D0D0E0]">{c.fundadores ? 'Fundadores' : 'Premium'} {x?.premium ?? 0}/12 escolhidos</span>
                {!c.fundadores && <span className="px-2 py-1 rounded-md bg-[#232230] text-[#D0D0E0]">Cupons {x?.inter ?? 0}/24</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ uma categoria ============
function DetalheCategoria({ cat, onVoltar }: { cat: Cat; onVoltar: () => void }) {
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const ok = (m: string) => { setAviso(m); setErro(''); };
  const falha = (m: string) => {
    setErro(/vitrine_vaga/.test(m) ? 'Rode a migration 071_vitrine_vaga.sql no Supabase.' : /categoria_patrocinio/.test(m) ? 'Rode a migration 059 no Supabase.' : /permission denied|row-level/i.test(m) ? 'O banco negou: entre com a conta de admin.' : m);
    setAviso('');
  };

  return (
    <div>
      <button onClick={onVoltar} className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-4"><ArrowLeft size={14} /> Todas as categorias</button>
      <h2 className="text-xl font-black mb-1">{cat.nome}</h2>
      <p className="text-[#A0A0B2] text-xs mb-5">Está na ordem em que aparece no app. Tudo o que você salvar aqui já vale no app.</p>
      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">{erro}</div>}
      {aviso && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs mb-4 flex items-center gap-2"><Check size={14} /> {aviso}</div>}

      <MasterCategoria cat={cat} ok={ok} falha={falha} />
      <VagasCategoria cat={cat} tipo="premium" total={12} ok={ok} falha={falha} />
      {!cat.fundadores && <SubcategoriasCategoria cat={cat} ok={ok} falha={falha} />}
      {!cat.fundadores && <VagasCategoria cat={cat} tipo="intermediario" total={24} ok={ok} falha={falha} />}
    </div>
  );
}

type Props = { cat: Cat; ok: (m: string) => void; falha: (m: string) => void };

// ---- 1) Patrocínio Master
function MasterCategoria({ cat, ok, falha }: Props) {
  const [p, setP] = useState<Patro>(PATRO_VAZIO);
  const [existe, setExiste] = useState(false);
  const [patrocinador, setPatrocinador] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('categoria_patrocinio').select('*, locais(nome)').eq('categoria', cat.slug).maybeSingle();
    if (data) {
      const d: any = data;
      setP({ ...PATRO_VAZIO, ...d, subtitulo: d.subtitulo || '', imagem_url: d.imagem_url || '' });
      setPatrocinador(d.locais?.nome || '');
      setExiste(true);
    } else { setP(PATRO_VAZIO); setPatrocinador(''); setExiste(false); }
  }, [cat.slug]);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!p.titulo.trim()) return falha('Escreva o título da faixa (os "dizeres").');
    setSalvando(true);
    const { error } = await supabase.from('categoria_patrocinio').upsert({
      categoria: cat.slug, local_id: p.local_id, tag: p.tag.trim() || 'PATROCÍNIO MASTER', titulo: p.titulo.trim(), subtitulo: p.subtitulo.trim() || null,
      cta: p.cta.trim() || 'Saiba mais', destino: p.destino.trim(), imagem_url: p.imagem_url.trim() || null, cor1: p.cor1, cor2: p.cor2, ativo: p.ativo,
    }, { onConflict: 'categoria' });
    setSalvando(false);
    if (error) return falha(error.message);
    ok('Patrocínio Master salvo — já aparece no app.'); setExiste(true);
  };
  const remover = async () => {
    if (!confirm('Remover o Patrocínio Master desta categoria? O app volta a mostrar o convite "Sua marca em destaque".')) return;
    const { error } = await supabase.from('categoria_patrocinio').delete().eq('categoria', cat.slug);
    if (error) return falha(error.message);
    ok('Removido.'); carregar();
  };
  const subirImagem = async (arquivo?: File) => {
    if (!arquivo) return;
    const e = erroFotoNaoSuportada(arquivo);
    if (e) return falha(e);
    const caminho = `patrocinio/${cat.slug}-${Date.now()}.${arquivo.name.split('.').pop() || 'jpg'}`;
    const { error } = await supabase.storage.from('fotos-destinos').upload(caminho, arquivo, { cacheControl: '3600' });
    if (error) return falha(`Não deu pra enviar a arte: ${error.message}`);
    setP((x) => ({ ...x, imagem_url: supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl }));
  };

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-black">1 · Patrocínio Master <span className="text-[#A0A0B2] font-semibold">(1 vaga)</span></h3>
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" className="accent-[#E1306C]" checked={p.ativo} onChange={(e) => setP({ ...p, ativo: e.target.checked })} /> Aparece no app</label>
      </div>
      <p className="text-xs text-[#A0A0B2] mb-4">A faixa grande no topo da categoria, abaixo do título. Pense nela como o &ldquo;nome da casa&rdquo; da categoria: uma marca forte (ex.: uma cervejaria em Bares). {existe ? '' : 'Ainda vazia: o app mostra o convite para anunciar.'}</p>
      <div className="rounded-2xl p-4 mb-4 min-h-[88px] relative overflow-hidden" style={{ background: p.imagem_url ? `linear-gradient(135deg, ${p.cor1}CC, ${p.cor2}CC), url(${p.imagem_url}) center/cover` : `linear-gradient(135deg, ${p.cor1}, ${p.cor2})` }}>
        <p className="text-[10px] font-black tracking-wider opacity-80">{p.tag || 'PATROCÍNIO MASTER'}</p>
        <p className="text-base font-black">{p.titulo || 'Os dizeres da faixa aparecem aqui'}</p>
        {p.subtitulo && <p className="text-xs opacity-90">{p.subtitulo}</p>}
        <span className="inline-block mt-2 text-[11px] font-bold bg-black/30 rounded-full px-3 py-1">{p.cta || 'Saiba mais'}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div><label className={label}>Etiqueta pequena</label><input className={input} maxLength={40} value={p.tag} onChange={(e) => setP({ ...p, tag: e.target.value })} /></div>
        <div><label className={label}>Texto do botão</label><input className={input} maxLength={24} value={p.cta} onChange={(e) => setP({ ...p, cta: e.target.value })} /></div>
      </div>
      <div className="space-y-3">
        <div><label className={label}>Título (os dizeres principais)</label><input className={input} maxLength={90} value={p.titulo} onChange={(e) => setP({ ...p, titulo: e.target.value })} /></div>
        <div><label className={label}>Frase de apoio (opcional)</label><input className={input} maxLength={120} value={p.subtitulo} onChange={(e) => setP({ ...p, subtitulo: e.target.value })} /></div>
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className={label}>Cor 1</label><input type="color" className="w-full h-10 bg-transparent" value={p.cor1} onChange={(e) => setP({ ...p, cor1: e.target.value })} /></div>
          <div><label className={label}>Cor 2</label><input type="color" className="w-full h-10 bg-transparent" value={p.cor2} onChange={(e) => setP({ ...p, cor2: e.target.value })} /></div>
          <div><label className={label}>Arte (imagem de fundo, opcional)</label>
            <input type="file" accept="image/*" className="text-xs" onChange={(e) => { subirImagem(e.target.files?.[0]); e.target.value = ''; }} />
            {p.imagem_url && <button className="text-[10px] text-[#E1306C] mt-1" onClick={() => setP({ ...p, imagem_url: '' })}>tirar arte</button>}
          </div>
        </div>
        <div>
          <label className={label}>Quem patrocina (o dono do local pode ajustar os dizeres pelo portal dele)</label>
          {p.local_id ? (
            <div className="flex items-center gap-3 text-sm"><b>{patrocinador || 'Local escolhido'}</b><button className="text-[11px] text-[#E1306C]" onClick={() => { setP({ ...p, local_id: null }); setPatrocinador(''); }}>trocar</button></div>
          ) : (
            <BuscaLocal onEscolher={(l) => { setP({ ...p, local_id: l.id, destino: p.destino || `local:${l.id}` }); setPatrocinador(l.nome); }} />
          )}
        </div>
        <div><label className={label}>Para onde o botão leva</label><input className={input} placeholder="local:ID, /rota do app ou https://…" value={p.destino} onChange={(e) => setP({ ...p, destino: e.target.value })} /><p className="text-[10px] text-[#626274] mt-1">Ao escolher o patrocinador acima, o botão já abre a página dele.</p></div>
        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando} className={botao}>{salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Patrocínio Master</button>
          {existe && <button onClick={remover} className={botaoCinza}><Trash2 size={14} /> Remover</button>}
        </div>
      </div>
    </div>
  );
}

// ---- 2) e 4) Vagas (Premium 12 / Intermediário 24)
function VagasCategoria({ cat, tipo, total, ok, falha }: Props & { tipo: 'premium' | 'intermediario'; total: number }) {
  const premium = tipo === 'premium';
  const nomeVaga = premium ? (cat.fundadores ? 'Banner Fundador' : 'Banner Premium') : 'Cupom';
  // Cupons: 1–10 Premium, 11–12 Fundador, 13–24 Intermediário.
  const rotuloVaga = (n: number) => premium ? `${nomeVaga} ${n}` : n <= 10 ? `Cupom Premium ${n}` : n <= 12 ? `Cupom Fundador ${n - 10}` : `Cupom Intermediário ${n - 12}`;
  const [vagas, setVagas] = useState<Record<number, LocalMini>>({});
  const [chamadas, setChamadas] = useState<Record<string, { chamada: string; cta: string }>>({});
  const [ofertas, setOfertas] = useState<Record<string, string>>({});
  const [automaticos, setAutomaticos] = useState<LocalMini[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [cham, setCham] = useState({ chamada: '', cta: 'Conhecer' });

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('vitrine_vaga').select('posicao, locais(id, nome, plano_comercial, plano_comercial_status, categoria)').eq('categoria', cat.slug).eq('tipo', tipo);
    const m: Record<number, LocalMini> = {};
    for (const r of (data as any[]) || []) if (r.locais) m[r.posicao] = r.locais;
    setVagas(m);
    const ids = Object.values(m).map((l) => l.id);
    if (ids.length) {
      if (premium) {
        const { data: ch } = await supabase.from('destaque_chamada').select('local_id, chamada, cta').in('local_id', ids);
        const c: Record<string, { chamada: string; cta: string }> = {};
        for (const x of (ch as any[]) || []) c[x.local_id] = { chamada: x.chamada, cta: x.cta };
        setChamadas(c);
      } else {
        const { data: of } = await supabase.from('cupons').select('local_id, titulo').in('local_id', ids).eq('ativo', true).order('created_at', { ascending: false });
        const o: Record<string, string> = {};
        for (const x of (of as any[]) || []) if (!o[x.local_id]) o[x.local_id] = x.titulo;
        setOfertas(o);
      }
    } else { setChamadas({}); setOfertas({}); }
    // Quem o app colocaria sozinho (pelo plano) nas vagas livres.
    if (premium && cat.real) {
      const { data: a } = await supabase.from('locais').select('id, nome, plano_comercial, plano_comercial_status').eq('status', 'aprovado').eq('categoria', cat.real).in('plano_comercial', cat.fundadores ? ['fundador'] : ['premium', 'fundador']).eq('plano_comercial_status', 'ativo').limit(60);
      // locais de outra categoria principal que também estão aqui (migration 072)
      const { data: ex } = await supabase.from('local_categorias_extra').select('locais!inner(id, nome, plano_comercial, plano_comercial_status, status)').eq('categoria', cat.real).eq('locais.status', 'aprovado').eq('locais.plano_comercial_status', 'ativo').in('locais.plano_comercial', cat.fundadores ? ['fundador'] : ['premium', 'fundador']);
      const extrasLoc = ((ex as any[]) || []).map((r) => r.locais as LocalMini).filter(Boolean);
      const mapa = new Map<string, LocalMini>();
      for (const l of [...((a as LocalMini[]) || []), ...extrasLoc]) mapa.set(l.id, l);
      setAutomaticos(Array.from(mapa.values()).sort((x, y) => x.id.localeCompare(y.id)));
    } else setAutomaticos([]);
  }, [cat.slug, cat.real, cat.fundadores, tipo, premium]);
  useEffect(() => { carregar(); }, [carregar]);

  const marcados = new Set(Object.values(vagas).map((l) => l.id));
  const livres = automaticos.filter((l) => !marcados.has(l.id));
  const autoDaVaga = useMemo(() => {
    const out: Record<number, LocalMini> = {};
    const fila = [...livres];
    for (let n = 1; n <= total; n++) if (!vagas[n] && fila.length) out[n] = fila.shift() as LocalMini;
    return out;
  }, [livres, vagas, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = async (n: number, l: LocalMini) => {
    await supabase.from('vitrine_vaga').delete().eq('categoria', cat.slug).eq('tipo', tipo).eq('local_id', l.id);
    const { error } = await supabase.from('vitrine_vaga').upsert({ categoria: cat.slug, tipo, posicao: n, local_id: l.id, atualizado_em: new Date().toISOString() }, { onConflict: 'categoria,tipo,posicao' });
    if (error) return falha(error.message);
    ok(`${l.nome} agora ocupa a vaga ${n}.`); carregar();
  };
  const liberar = async (n: number) => {
    const { error } = await supabase.from('vitrine_vaga').delete().eq('categoria', cat.slug).eq('tipo', tipo).eq('posicao', n);
    if (error) return falha(error.message);
    ok(`Vaga ${n} liberada — volta a ser automática.`); setSel(null); carregar();
  };
  const salvarChamada = async (l: LocalMini) => {
    if (!cham.chamada.trim()) return falha('Escreva a frase do banner.');
    const { error } = await supabase.from('destaque_chamada').upsert({ local_id: l.id, chamada: cham.chamada.trim(), cta: cham.cta.trim() || 'Conhecer', escrito_por: 'equipe' });
    if (error) return falha(error.message);
    ok('Frase salva — o banner já usa esse texto.'); carregar();
  };

  const abrirVaga = (n: number) => {
    setSel(n === sel ? null : n);
    const l = vagas[n] || autoDaVaga[n];
    const c = l ? chamadas[l.id] : undefined;
    setCham({ chamada: c?.chamada || '', cta: c?.cta || 'Conhecer' });
  };

  const grupo = premium ? 4 : 6;
  const quando = premium ? 'Rodam 4 por vez e a janela avança a cada hora (vagas 1–4, depois 5–8, depois 9–12).' : 'Aparecem 6 por vez (3 por linha): 3 do grupo Premium/Fundador (vagas 1–12) + 3 do grupo Intermediário (vagas 13–24). Premium/Fundador mudam a cada 10 minutos e Intermediário a cada 30 minutos. Os 2 cupons de Fundador trocam entre todos os Fundadores; com mais de 12 Intermediários, metade aparece a cada hora.';
  const regra = premium
    ? cat.fundadores ? 'Ocupadas pelos Membros Fundadores.' : 'Ocupadas por locais Premium (ou Fundador) da categoria. Quem você escolher aparece mesmo sem plano — mas o ideal é o plano estar ativo.'
    : 'Premium e Fundador publicam 1 cupom por semana; o Intermediário, 1 a cada 2 semanas. A vaga mostra o cupom mais recente do local. Vaga cinza = automática (o app preenche pelo plano).';

  return (
    <div className={card}>
      <h3 className="text-sm font-black mb-1">{premium ? '2' : '4'} · {premium ? nomeVaga : 'Cupons'} <span className="text-[#A0A0B2] font-semibold">({total} vagas{premium ? '' : ': 10 Premium + 2 Fundador + 12 Intermediário'})</span></h3>
      <p className="text-xs text-[#A0A0B2] mb-1">{quando}</p>
      <p className="text-xs text-[#A0A0B2] mb-4">{regra} Vaga em cinza = automática (o app escolhe pelo plano); escolha um local para fixar a posição dele.</p>
      <div className={`grid gap-2 ${premium ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const l = vagas[n];
          const a = autoDaVaga[n];
          const fixa = !!l;
          const dono = l || a;
          const alerta = fixa && !planoPago(l) ? 'plano não ativo' : null;
          return (
            <button key={n} onClick={() => abrirVaga(n)} className={`text-left rounded-xl p-3 border transition min-h-[78px] ${sel === n ? 'border-[#E1306C] bg-[#E1306C]/10' : fixa ? 'border-[#4CAF7D]/50 bg-[#4CAF7D]/5' : 'border-[#232230] bg-[#0B0B0E]'}`}>
              <p className="text-[10px] font-black text-[#8888A0]">{rotuloVaga(n)}{premium && (n - 1) % grupo === 0 ? ` · grupo ${Math.floor((n - 1) / grupo) + 1}` : ''}</p>
              {dono ? <p className="text-xs font-bold mt-1 truncate">{dono.nome}</p> : <p className="text-xs text-[#626274] mt-1">Vazia (automática)</p>}
              <p className="text-[10px] text-[#A0A0B2] mt-0.5 truncate">{dono ? `${fixa ? 'Fixada por você' : 'Automática'} · ${rotuloPlano(dono)}` : ''}</p>
              {alerta && <p className="text-[10px] text-amber-400">{alerta}</p>}
              {!premium && l && !ofertas[l.id] && <p className="text-[10px] text-amber-400">sem oferta ativa</p>}
              {!premium && l && ofertas[l.id] && <p className="text-[10px] text-[#D0D0E0] truncate">“{ofertas[l.id]}”</p>}
              {premium && l && chamadas[l.id] && <p className="text-[10px] text-[#D0D0E0] truncate">“{chamadas[l.id].chamada}”</p>}
            </button>
          );
        })}
      </div>

      {sel !== null && (
        <div className="mt-4 bg-[#0B0B0E] border border-[#232230] rounded-xl p-4">
          <p className="text-xs font-black mb-3">{rotuloVaga(sel)}</p>
          <label className={label}>{vagas[sel] ? 'Trocar o local desta vaga' : 'Escolher o local desta vaga'}</label>
          <BuscaLocal onEscolher={(l) => escolher(sel, l)} />
          {(vagas[sel] || autoDaVaga[sel]) && premium && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#A0A0B2]">Frase do banner de <b className="text-white">{(vagas[sel] || autoDaVaga[sel]).nome}</b> (o nome do local não aparece no banner, só a frase). O parceiro Premium também pode alterá-la toda semana pelo portal dele.</p>
              <div><label className={label}>Frase (até 90 caracteres)</label><input className={input} maxLength={90} value={cham.chamada} onChange={(e) => setCham({ ...cham, chamada: e.target.value })} /></div>
              <div><label className={label}>Texto do botão</label><input className={input} maxLength={24} value={cham.cta} onChange={(e) => setCham({ ...cham, cta: e.target.value })} /></div>
              <button onClick={() => salvarChamada(vagas[sel] || autoDaVaga[sel])} className={botao}><Save size={14} /> Salvar frase</button>
            </div>
          )}
          {!premium && <p className="text-[11px] text-[#A0A0B2] mt-3">A oferta mostrada é a oferta ativa do local (ele publica no portal; a equipe também cria ofertas em Vitrine &gt; Ofertas da equipe).</p>}
          {vagas[sel] && <button onClick={() => liberar(sel)} className={botaoCinza + ' mt-4'}><Trash2 size={14} /> Liberar vaga (volta a ser automática)</button>}
        </div>
      )}
    </div>
  );
}

// ---- 3) Subcategorias
function SubcategoriasCategoria({ cat, ok, falha }: Props) {
  const chaveSub = cat.real ?? cat.slug;
  const defs = SUBCATEGORIAS_APP[chaveSub]?.itens;
  const [desligadas, setDesligadas] = useState<Set<string>>(new Set());
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('subcategoria_config').select('chave').eq('categoria', chaveSub).eq('ativo', false);
    setDesligadas(new Set(((data as any[]) || []).map((r) => r.chave as string)));
    if (cat.real) {
      const { data: ls } = await supabase.from('locais').select('subcategoria').eq('status', 'aprovado').eq('categoria', cat.real).limit(3000);
      const c: Record<string, number> = {};
      for (const l of (ls as any[]) || []) { const k = norm(l.subcategoria || ''); if (k) c[k] = (c[k] || 0) + 1; }
      // locais que têm esta categoria como EXTRA (migration 072)
      const { data: ex } = await supabase.from('local_categorias_extra').select('subcategoria, locais!inner(status)').eq('categoria', cat.real).eq('locais.status', 'aprovado');
      for (const l of (ex as any[]) || []) { const k = norm(l.subcategoria || ''); if (k) c[k] = (c[k] || 0) + 1; }
      setContagem(c);
    }
  }, [chaveSub, cat.real]);
  useEffect(() => { carregar(); }, [carregar]);
  if (!defs) return null;
  const alternar = async (chave: string, ligar: boolean) => {
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: chaveSub, chave, ativo: ligar, atualizado_em: new Date().toISOString() });
    if (error) return falha(error.message.includes('subcategoria_config') ? 'Rode a migration 065 no Supabase.' : error.message);
    ok(ligar ? 'Subcategoria aparece no app.' : 'Subcategoria escondida do app.'); carregar();
  };
  return (
    <div className={card}>
      <h3 className="text-sm font-black mb-1">3 · Subcategorias <span className="text-[#A0A0B2] font-semibold">(ícones redondos)</span></h3>
      <p className="text-xs text-[#A0A0B2] mb-4">Os ícones logo abaixo dos Banners Premium. Ligue quando já houver local cadastrado nela. Ligada sem nenhum local, o ícone aparece como &ldquo;em breve&rdquo;; desligada, some do app. A contagem usa o nome que o parceiro escolheu no cadastro.</p>
      <div className="divide-y divide-[#232230]">
        {defs.map((d) => {
          const ligada = !desligadas.has(d.chave);
          const n = contagem[d.chave] || contagem[norm(d.rotulo)] || 0;
          return (
            <div key={d.chave} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{d.rotulo}</p>
                <p className={`text-[11px] ${n > 0 ? 'text-[#4CAF7D]' : 'text-[#626274]'}`}>{n > 0 ? `${n} local${n > 1 ? 'is' : ''} cadastrado${n > 1 ? 's' : ''}` : 'nenhum local ainda'}</p>
              </div>
              <button onClick={() => alternar(d.chave, !ligada)} className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${ligada ? 'bg-[#4CAF7D]/15 border-[#4CAF7D]/40 text-[#4CAF7D]' : 'bg-[#232230] border-[#232230] text-[#A0A0B2]'}`}>
                {ligada ? (n > 0 ? 'Aparece no app' : 'Aparece como "em breve"') : 'Escondida'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
