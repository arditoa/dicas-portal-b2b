'use client';
// Aba "Categorias" do /admin (nov/2026) — o jeito óbvio de mexer no que aparece no app.
// Primeiro você escolhe a categoria; dentro dela ficam, na ordem em que aparecem no app:
//   1) Patrocínio Master  → a faixa grande do topo (1 vaga; tabela categoria_patrocinio)
//   2) Banner Premium     → 12 vagas, 4 por hora (tabela vitrine_vaga, tipo premium; texto em destaque_chamada)
//   3) Subcategorias      → os ícones redondos; liga/desliga (tabela subcategoria_config)
//   4) Cupons (em 'festas' vira "Festas pagas": eventos com destaque_secoes ∋ 'patrocinado', máx. 24; ver FestasPagas)             → 24 posições (1–10 Premium, 11–12 Fundador, 13–24 Intermediário), 6 por vez (3 + 3), Premium/Fundador avançam a cada 10 min e Intermediário a cada 30 min (vitrine_vaga, tipo intermediario)
// Vaga sem local escolhido = AUTOMÁTICA: o app preenche pelo plano do local. Escolher um local aqui manda nele.
// Migrations: 059 (patrocínio), 060 (chamada), 065 (subcategorias), 071 (vagas).
import { ArrowLeft, Check, ChevronRight, Loader2, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { erroFotoNaoSuportada } from '../lib/validarFoto';
import { SUBCATEGORIAS_APP } from '../lib/subcategoriasApp';
import QuadroCliques from './QuadroCliques';

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
  { slug: 'festas', nome: 'Festas & Eventos', real: 'eventos', aberta: true },
  { slug: 'servicos', nome: 'Serviços', real: 'servicos', aberta: true },
  { slug: 'turismo', nome: 'Turismo | Dicas Trip', real: 'turismo', aberta: true },
  { slug: 'artistas', nome: 'Artistas', real: 'artistas', aberta: true },
  { slug: 'beleza', nome: 'Beleza & Estética', real: 'beleza', aberta: true },
  { slug: 'mais18', nome: 'Espaços 18+', real: 'mais18', aberta: true },
  { slug: 'gastronomia', nome: 'Gastronomia', real: 'gastronomia', aberta: false },
  { slug: 'cultura', nome: 'Cultura', real: 'cultura', aberta: false },
  { slug: 'educacao', nome: 'Educação', real: 'educacao', aberta: false },
  { slug: 'produtos', nome: 'Moda & Acessórios', real: 'produtos', aberta: true },
  { slug: 'lazer', nome: 'Experiências & Lazer', real: 'lazer', aberta: false },
  { slug: 'saude', nome: 'Saúde & Bem-estar', real: 'saude', aberta: true },
  { slug: 'comunidade', nome: 'Comunidade & Apoio', real: null, aberta: false },
];

type LocalMini = { id: string; nome: string; plano_comercial: string | null; plano_comercial_status: string | null; categoria?: string | null };
type Vaga = { posicao: number; local: LocalMini };
type Patro = { local_id: string | null; tag: string; titulo: string; subtitulo: string; cta: string; destino: string; imagem_url: string; cor1: string; cor2: string; ativo: boolean };
const PATRO_VAZIO: Patro = { local_id: null, tag: 'PATROCÍNIO MASTER', titulo: '', subtitulo: '', cta: 'Saiba mais', destino: '', imagem_url: '', cor1: '#7E57C2', cor2: '#E1306C', ativo: true };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const planoPago = (l: LocalMini) => !!l.plano_comercial && l.plano_comercial !== 'freemium' && (l.plano_comercial_status ?? 'ativo') === 'ativo';
const rotuloPlano = (l: LocalMini) => (l.plano_comercial === 'fundador' ? 'Fundador' : l.plano_comercial === 'premium' ? 'Premium' : l.plano_comercial === 'intermediario' ? 'Intermediário' : l.plano_comercial === 'starter' ? 'Starter' : 'Gratuito') + (planoPago(l) || l.plano_comercial === 'freemium' ? '' : ' (não ativo)');

function BuscaLocal({ onEscolher, texto = 'Buscar local pelo nome…', categoria }: { onEscolher: (l: LocalMini) => void; texto?: string; categoria?: string }) {
  const [q, setQ] = useState('');
  const [achados, setAchados] = useState<LocalMini[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setAchados([]); return; }
      let consulta = supabase.from('locais').select('id, nome, plano_comercial, plano_comercial_status, categoria').eq('status', 'aprovado').ilike('nome', `%${q.trim()}%`);
      if (categoria) consulta = consulta.eq('categoria', categoria);
      const { data } = await consulta.limit(8);
      setAchados((data as LocalMini[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, categoria]);
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
        <b> 12 Banners Premium</b> (rodam 4 por hora), as <b>Subcategorias</b> (ícones redondos) e os <b>24 Cupons</b> (em <b>Festas &amp; Eventos</b> não há cupom: ali ficam as <b>24 Festas pagas</b> a R$ 89, de 1 dia antes até o dia) (quadradinhos: 10 Premium + 2 Fundador + 12 Intermediário; cada tela mostra 6 = 3 Premium/Fundador + 3 Intermediário; Premium/Fundador mudam a cada 10 min e Intermediário a cada 30 min).
        Vaga sem local escolhido é <b>automática</b>: o app preenche sozinho pelo plano do local.
      </div>
      <QuadroCliques />
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
                {!c.fundadores && c.slug !== 'festas' && <span className="px-2 py-1 rounded-md bg-[#232230] text-[#D0D0E0]">Cupons {x?.inter ?? 0}/24</span>}
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
      {!cat.fundadores && cat.slug !== 'festas' && <VagasCategoria cat={cat} tipo="intermediario" total={24} ok={ok} falha={falha} />}
      {cat.slug === 'festas' && <FestasPagas cat={cat} ok={ok} falha={falha} />}
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
    } else { setP({ ...PATRO_VAZIO, ativo: false }); setPatrocinador(''); setExiste(false); }
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
    if (!confirm('Remover o Patrocínio Master desta categoria? A faixa some do app até você cadastrar outro.')) return;
    const { error } = await supabase.from('categoria_patrocinio').delete().eq('categoria', cat.slug);
    if (error) return falha(error.message);
    ok('Removido.'); carregar();
  };
  // Tick "Aparece no app": se o Master já existe, liga/desliga na hora; se ainda não existe, só abre o formulário para preencher.
  const alternarMaster = async (ligar: boolean) => {
    if (existe) {
      const { error } = await supabase.from('categoria_patrocinio').update({ ativo: ligar }).eq('categoria', cat.slug);
      if (error) return falha(error.message);
      ok(ligar ? 'Patrocínio Master aparece no app.' : 'Patrocínio Master escondido do app.');
    }
    setP((x) => ({ ...x, ativo: ligar }));
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
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer shrink-0"><input type="checkbox" className="accent-[#E1306C]" checked={p.ativo} onChange={(e) => alternarMaster(e.target.checked)} /> Aparece no app</label>
      </div>
      {!p.ativo ? (
        <p className="text-xs text-[#626274]">Desligado — não aparece no app. Marque &ldquo;Aparece no app&rdquo; quando houver patrocinador.</p>
      ) : (<>
      <p className="text-xs text-[#A0A0B2] mb-4">A faixa grande no topo da categoria, abaixo do título. Pense nela como o &ldquo;nome da casa&rdquo; da categoria: uma marca forte (ex.: uma cervejaria em Bares).</p>
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
            <BuscaLocal categoria={cat.slug === 'festas' ? 'eventos' : undefined} onEscolher={(l) => { setP({ ...p, local_id: l.id, destino: p.destino || `local:${l.id}` }); setPatrocinador(l.nome); }} />
          )}
        </div>
        <div><label className={label}>Para onde o botão leva</label><input className={input} placeholder="local:ID, /rota do app ou https://…" value={p.destino} onChange={(e) => setP({ ...p, destino: e.target.value })} /><p className="text-[10px] text-[#626274] mt-1">Ao escolher o patrocinador acima, o botão já abre a página dele.</p></div>
        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando} className={botao}>{salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Patrocínio Master</button>
          {existe && <button onClick={remover} className={botaoCinza}><Trash2 size={14} /> Remover</button>}
        </div>
      </div>
      </>)}
    </div>
  );
}

// Tick "Aparece no app" de uma seção (banner rotativo / cupons) de uma página.
// Fica em subcategoria_config (categoria = slug da página, chave = '__banner' ou '__cupons'); o app só esconde a seção quando está desligada (ativo = false).
function useLigada(slug: string, chave: string, falha: (m: string) => void) {
  const [salva, setSalva] = useState<boolean | null>(null);
  const [lido, setLido] = useState(false);
  useEffect(() => {
    let vivo = true;
    setLido(false);
    (async () => {
      const { data } = await supabase.from('subcategoria_config').select('ativo').eq('categoria', slug).eq('chave', chave).maybeSingle();
      if (vivo) { setSalva(data ? !!(data as any).ativo : null); setLido(true); }
    })();
    return () => { vivo = false; };
  }, [slug, chave]);
  const gravar = async (v: boolean) => {
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: slug, chave, ativo: v, atualizado_em: new Date().toISOString() });
    if (error) { falha(error.message.includes('subcategoria_config') ? 'Rode a migration 065 no Supabase.' : error.message); return false; }
    setSalva(v);
    return true;
  };
  return { salva, lido, gravar };
}

// ---- 4) Festas pagas (só na categoria Festas & Eventos): no lugar dos cupons.
// Festa avulsa paga (R$ 89 de lançamento) = evento aprovado marcado com 'patrocinado' em destaque_secoes.
// O app mostra a festa de 1 dia antes até 6h depois do fim, no máximo 24 ao mesmo tempo.
type FestaMini = { id: string; titulo: string; data_inicio: string; destaque_secoes: string[] | null; locais?: { nome: string } | null };
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const diaChave = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

function FestasPagas({ cat, ok, falha }: Props) {
  const [pagas, setPagas] = useState<FestaMini[]>([]);
  const [achadas, setAchadas] = useState<FestaMini[]>([]);
  const [q, setQ] = useState('');
  const [pronto, setPronto] = useState(false);
  const tick = useLigada(cat.slug, '__festas', falha);
  const LIMITE = 24;
  const POR_DIA = 12;

  const carregar = useCallback(async () => {
    const ontem = new Date(); ontem.setHours(0, 0, 0, 0); ontem.setDate(ontem.getDate() - 1);
    const { data } = await supabase.from('eventos').select('id, titulo, data_inicio, destaque_secoes, locais(nome)').eq('status', 'aprovado').contains('destaque_secoes', ['patrocinado']).gte('data_inicio', ontem.toISOString()).order('data_inicio', { ascending: true }).limit(200);
    setPagas((data as any[]) || []);
    setPronto(true);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setAchadas([]); return; }
      const ontem = new Date(); ontem.setHours(0, 0, 0, 0);
      const { data } = await supabase.from('eventos').select('id, titulo, data_inicio, destaque_secoes, locais(nome)').eq('status', 'aprovado').ilike('titulo', `%${q.trim()}%`).gte('data_inicio', ontem.toISOString()).order('data_inicio', { ascending: true }).limit(8);
      setAchadas(((data as any[]) || []).filter((e) => !(e.destaque_secoes || []).includes('patrocinado')));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const trocar = async (e: FestaMini, pagar: boolean) => {
    const atual = (e.destaque_secoes || []).filter((x) => x !== 'patrocinado');
    if (pagar) {
      const mesmoDia = pagas.filter((x) => diaChave(x.data_inicio) === diaChave(e.data_inicio)).length;
      if (pagas.length >= LIMITE) return falha(`Limite de ${LIMITE} festas pagas atingido. Libere uma antes.`);
      if (mesmoDia >= POR_DIA) return falha(`Já há ${POR_DIA} festas pagas neste dia. Escolha outra data ou libere uma.`);
    }
    const { error } = await supabase.from('eventos').update({ destaque_secoes: pagar ? [...atual, 'patrocinado'] : atual }).eq('id', e.id);
    if (error) return falha(error.message);
    ok(pagar ? `"${e.titulo}" agora roda como festa paga (1 dia antes e no dia).` : `"${e.titulo}" saiu das festas pagas.`);
    setQ(''); setAchadas([]); carregar();
  };

  const ligada = tick.salva ?? true;
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-black">4 · Festas pagas <span className="text-[#A0A0B2] font-semibold">({pagas.length}/{LIMITE} vagas · R$ 89 por divulgação)</span></h3>
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer shrink-0"><input type="checkbox" className="accent-[#E1306C]" checked={ligada} disabled={!pronto || !tick.lido} onChange={async (e) => { if (await tick.gravar(e.target.checked)) ok(e.target.checked ? 'Festas pagas aparecem no app.' : 'Festas pagas escondidas do app.'); }} /> Aparece no app</label>
      </div>
      <p className="text-xs text-[#A0A0B2] mb-1">Aqui não tem cupom: são as festas avulsas que pagaram a divulgação. Cada festa roda no app <b>1 dia antes e no dia</b> (até 6h depois do fim), na aba Eventos, e fica na frente nas listas.</p>
      <p className="text-xs text-[#A0A0B2] mb-4">Limite: {LIMITE} ao mesmo tempo, no máximo {POR_DIA} por data. Cobrança manual pela equipe por enquanto.</p>
      {!pronto ? <p className="text-xs text-[#626274]">Carregando…</p> : (<>
        {pagas.length === 0 ? <p className="text-xs text-[#626274] mb-4">Nenhuma festa paga ainda.</p> : (
          <div className="space-y-1.5 mb-4">
            {pagas.map((e, i) => (
              <div key={e.id} className="flex items-center justify-between gap-3 bg-[#0B0B0E] border border-[#232230] rounded-xl px-3 py-2 text-xs">
                <span><b>{i + 1}.</b> {e.titulo} <span className="text-[#A0A0B2]">· {e.locais?.nome ? `${e.locais.nome} · ` : ''}{dataCurta(e.data_inicio)}</span></span>
                <button onClick={() => trocar(e, false)} className="text-[#A0A0B2] hover:text-red-400 shrink-0 inline-flex items-center gap-1"><Trash2 size={13} /> Tirar</button>
              </div>
            ))}
          </div>
        )}
        <label className={label}>Marcar uma festa como paga</label>
        <input className={input} placeholder="Buscar festa pelo nome…" value={q} onChange={(e) => setQ(e.target.value)} />
        {achadas.length > 0 && (
          <div className="mt-1 bg-[#0B0B0E] border border-[#232230] rounded-xl overflow-hidden">
            {achadas.map((e) => (
              <button key={e.id} onClick={() => trocar(e, true)} className="w-full text-left px-3 py-2 text-xs hover:bg-[#1D1C2A] flex justify-between gap-3">
                <span className="font-bold">{e.titulo}</span>
                <span className="text-[#A0A0B2]">{dataCurta(e.data_inicio)}</span>
              </button>
            ))}
          </div>
        )}
      </>)}
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
  const tick = useLigada(cat.slug, premium ? '__banner' : '__cupons', falha);
  const [pronto, setPronto] = useState(false);
  const [edicao, setEdicao] = useState<Record<string, { chamada: string; cta: string }>>({}); // dizeres em edição, por local
  const [grade, setGrade] = useState(false); // mostra as 12 vagas (só nos banners)
  const [novaVaga, setNovaVaga] = useState(0);

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
    setPronto(true);
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
  const salvarChamada = async (l: LocalMini, c = cham) => {
    if (!c.chamada.trim()) return falha('Escreva a frase do banner.');
    const { error } = await supabase.from('destaque_chamada').upsert({ local_id: l.id, chamada: c.chamada.trim(), cta: c.cta.trim() || 'Conhecer', escrito_por: 'equipe' });
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

  // Tick "Aparece no app": gravado = manda; sem registro, liga sozinho quando já há alguém nas vagas.
  const algoFixo = Object.keys(vagas).length > 0;
  const ligada = tick.salva ?? (algoFixo || (premium && automaticos.length > 0));
  const livresN = Array.from({ length: total }, (_, i) => i + 1).filter((n) => !vagas[n]);
  const alternar = async (v: boolean) => {
    if (await tick.gravar(v)) ok(v ? `${premium ? 'Banner' : 'Cupons'} aparece no app.` : `${premium ? 'Banner' : 'Cupons'} escondido do app.`);
  };

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-black">{premium ? '2' : '4'} · {premium ? nomeVaga : 'Cupons'} <span className="text-[#A0A0B2] font-semibold">({total} vagas{premium ? '' : ': 10 Premium + 2 Fundador + 12 Intermediário'})</span></h3>
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer shrink-0"><input type="checkbox" className="accent-[#E1306C]" checked={ligada} disabled={!pronto || !tick.lido} onChange={(e) => alternar(e.target.checked)} /> Aparece no app</label>
      </div>
      {!pronto || !tick.lido ? (
        <p className="text-xs text-[#626274]">Carregando…</p>
      ) : !ligada ? (
        <p className="text-xs text-[#626274]">Desligado — não aparece no app. Marque &ldquo;Aparece no app&rdquo; quando houver anunciante.</p>
      ) : (<>
      {premium ? (
        <p className="text-xs text-[#A0A0B2] mb-4">Rodam 4 por vez, trocando a cada hora. Escreva abaixo os dizeres de cada local; o nome dele não aparece no banner, só a frase. {regra}</p>
      ) : (<>
        <p className="text-xs text-[#A0A0B2] mb-1">{quando}</p>
        <p className="text-xs text-[#A0A0B2] mb-4">{regra} Vaga em cinza = automática (o app escolhe pelo plano); escolha um local para fixar a posição dele.</p>
      </>)}

      {premium && (
        <div className="space-y-3 mb-4">
          {Array.from({ length: total }, (_, i) => i + 1).filter((n) => vagas[n] || autoDaVaga[n]).map((n) => {
            const l = (vagas[n] || autoDaVaga[n]) as LocalMini;
            const fixa = !!vagas[n];
            const salvo = { chamada: chamadas[l.id]?.chamada || '', cta: chamadas[l.id]?.cta || 'Conhecer' };
            const v = edicao[l.id] ?? salvo;
            const mudou = v.chamada !== salvo.chamada || v.cta !== salvo.cta;
            return (
              <div key={n} className={`rounded-xl border p-3 ${fixa ? 'border-[#4CAF7D]/50 bg-[#4CAF7D]/5' : 'border-[#232230] bg-[#0B0B0E]'}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-black">{rotuloVaga(n)} · <span className="text-white">{l.nome}</span></p>
                  <span className="text-[10px] text-[#A0A0B2]">{fixa ? 'Fixada por você' : 'Automática'} · {rotuloPlano(l)}</span>
                </div>
                {fixa && !planoPago(l) && <p className="text-[10px] text-amber-400 mt-0.5">plano não ativo — aparece só porque você fixou</p>}
                <label className={`${label} mt-3`}>Dizeres do banner (até 90 caracteres)</label>
                <input className={input} maxLength={90} placeholder="Escreva a frase que aparece no banner" value={v.chamada} onChange={(e) => setEdicao((m) => ({ ...m, [l.id]: { ...v, chamada: e.target.value } }))} />
                <div className="grid grid-cols-[1fr_auto] gap-2 mt-2 items-end">
                  <div>
                    <label className={label}>Texto do botão</label>
                    <input className={input} maxLength={24} value={v.cta} onChange={(e) => setEdicao((m) => ({ ...m, [l.id]: { ...v, cta: e.target.value } }))} />
                  </div>
                  <button onClick={() => salvarChamada(l, v)} disabled={!mudou || !v.chamada.trim()} className={botao}><Save size={14} /> Salvar dizeres</button>
                </div>
                {fixa && <button onClick={() => liberar(n)} className="text-[11px] text-[#E1306C] mt-2">Liberar esta vaga (volta a ser automática)</button>}
              </div>
            );
          })}
          {!Object.keys(vagas).length && !automaticos.length && <p className="text-xs text-[#A0A0B2]">Nenhum local nas vagas ainda. Adicione um abaixo.</p>}

          {livresN.length > 0 && (
            <div className="rounded-xl border border-dashed border-[#232230] p-3">
              <p className="text-xs font-bold mb-2">Adicionar um local a uma vaga</p>
              <div className="grid md:grid-cols-[1fr_auto] gap-2 items-start">
                <BuscaLocal categoria={cat.slug === 'festas' ? 'eventos' : undefined} texto="Buscar local pelo nome…" onEscolher={(l) => escolher(novaVaga || livresN[0], l)} />
                <select className={`${input} md:w-40`} value={novaVaga || livresN[0]} onChange={(e) => setNovaVaga(Number(e.target.value))} aria-label="Vaga">
                  {livresN.map((n) => <option key={n} value={n}>Vaga {n}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-[#626274] mt-1">Vagas sem ninguém fixado são preenchidas sozinhas pelo plano. Ao escolher o local, ele fica fixo na vaga escolhida.</p>
            </div>
          )}
          <button type="button" onClick={() => setGrade((g) => !g)} className="text-xs font-bold text-[#E1306C]">{grade ? 'Esconder o quadro das 12 vagas' : 'Ver o quadro das 12 vagas'}</button>
        </div>
      )}

      {(!premium || grade) && (<>
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
          <BuscaLocal categoria={cat.slug === 'festas' ? 'eventos' : undefined} onEscolher={(l) => escolher(sel, l)} />
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
      </>)}
      </>)}
    </div>
  );
}

// ---- 3) Subcategorias
function SubcategoriasCategoria({ cat, ok, falha }: Props) {
  const chaveSub = cat.real ?? cat.slug;
  const defs = SUBCATEGORIAS_APP[chaveSub]?.itens;
  const [desligadas, setDesligadas] = useState<Set<string>>(new Set());
  const [contagem, setContagem] = useState<Record<string, number>>({});
  // Escolha manual "Em breve" (true) ou "Ativar" (false), guardada em linhas "breve:<chave>"; sem linha = automático.
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('subcategoria_config').select('chave, ativo').eq('categoria', chaveSub);
    const linhas = ((data as any[]) || []) as { chave: string; ativo: boolean }[];
    setDesligadas(new Set(linhas.filter((r) => !r.ativo && !r.chave.startsWith('breve:')).map((r) => r.chave)));
    setManual(Object.fromEntries(linhas.filter((r) => r.chave.startsWith('breve:')).map((r) => [r.chave.slice(6), !!r.ativo])));
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
  type Estado = 'ativa' | 'breve' | 'escondida';
  const grava = async (chave: string, ativo: boolean) => {
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: chaveSub, chave, ativo, atualizado_em: new Date().toISOString() });
    if (error) { falha(error.message.includes('subcategoria_config') ? 'Rode a migration 065 no Supabase.' : error.message); return false; }
    return true;
  };
  const definir = async (chave: string, estado: Estado) => {
    // "Esconder" só mexe no liga/desliga; "Ativar" e "Em breve" religam e guardam a escolha.
    const feito = estado === 'escondida'
      ? await grava(chave, false)
      : (await grava(chave, true)) && (await grava(`breve:${chave}`, estado === 'breve'));
    if (!feito) return;
    ok(estado === 'ativa' ? 'Subcategoria ativada no app.' : estado === 'breve' ? 'Subcategoria aparece como "em breve".' : 'Subcategoria escondida do app.');
    carregar();
  };
  const OPCOES: { v: Estado; nome: string; cor: string }[] = [
    { v: 'ativa', nome: 'Ativar', cor: 'bg-[#4CAF7D]/15 border-[#4CAF7D]/50 text-[#4CAF7D]' },
    { v: 'breve', nome: 'Em breve', cor: 'bg-[#7E57C2]/20 border-[#7E57C2]/60 text-[#B39DDB]' },
    { v: 'escondida', nome: 'Esconder', cor: 'bg-[#232230] border-[#3A3850] text-white' },
  ];
  return (
    <div className={card}>
      <h3 className="text-sm font-black mb-1">3 · Subcategorias <span className="text-[#A0A0B2] font-semibold">(ícones redondos)</span></h3>
      <p className="text-xs text-[#A0A0B2] mb-1">Os ícones logo abaixo dos banners. Para cada um, escolha:</p>
      <ul className="text-xs text-[#A0A0B2] mb-4 space-y-0.5">
        <li><b className="text-[#4CAF7D]">Ativar</b> — aparece normal, sem selo.</li>
        <li><b className="text-[#B39DDB]">Em breve</b> — aparece com o selo EM BREVE (o visitante pode pedir aviso).</li>
        <li><b className="text-white">Esconder</b> — some do app.</li>
        <li>Se você não escolher, o app decide sozinho: aparece como &ldquo;em breve&rdquo; enquanto não houver nenhum local nela (a contagem usa o nome escolhido no cadastro).</li>
      </ul>
      <div className="divide-y divide-[#232230]">
        {defs.map((d) => {
          const n = contagem[d.chave] || contagem[norm(d.rotulo)] || 0;
          const escolha = manual[d.chave]; // true = em breve, false = ativar, undefined = automático
          const atual: Estado = desligadas.has(d.chave) ? 'escondida' : escolha === true ? 'breve' : escolha === false ? 'ativa' : n > 0 ? 'ativa' : 'breve';
          const automatico = !desligadas.has(d.chave) && escolha === undefined;
          return (
            <div key={d.chave} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{d.rotulo}</p>
                <p className={`text-[11px] ${n > 0 ? 'text-[#4CAF7D]' : 'text-[#626274]'}`}>{n > 0 ? `${n} local${n > 1 ? 'is' : ''} cadastrado${n > 1 ? 's' : ''}` : 'nenhum local ainda'}{automatico ? ' · automático' : ''}</p>
              </div>
              <div role="group" aria-label={`Estado de ${d.rotulo}`} className="shrink-0 inline-flex rounded-lg overflow-hidden border border-[#232230]">
                {OPCOES.map((o) => (
                  <button key={o.v} type="button" onClick={() => definir(d.chave, o.v)} aria-pressed={atual === o.v} className={`text-xs font-bold px-3 py-1.5 border-r last:border-r-0 border-[#232230] transition ${atual === o.v ? o.cor : 'bg-[#0B0B0E] border-[#232230] text-[#626274] hover:text-white'}`}>
                    {o.nome}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
