// Vitrine de vendas (out/2026): banner fixo de patrocínio por categoria, ofertas e benefícios,
// comunicação dos Membros Fundadores (escrita pela equipe) e medição "você está em destaque".
// Tudo tolera as tabelas ainda não existirem (migration 059): sem elas, os blocos mostram o padrão.
import { registrarCliqueBanner, registrarVisualizacaoBanner } from './analytics';
import { supabase } from './supabase';

export type Patrocinio = {
  categoria: string;
  local_id: string | null;
  tag: string;
  titulo: string;
  subtitulo: string | null;
  cta: string;
  destino: string;
  imagem_url: string | null;
  cor1: string;
  cor2: string;
};

export type OfertaVitrine = {
  id: string;
  local_id: string;
  titulo: string;
  descricao: string | null;
  valido_ate: string | null;
  imagem_url: string | null;
  equipe: boolean;
  nome_local: string;
  foto_local: string | null;
  plano_comercial: string | null;
  plano_comercial_status: string | null;
  criado_em?: string | null;
  // Aparência opcional na faixa de Ofertas (migração 109). Sem ela, o cartão é automático.
  vitrine_oferta?: string | null;
  vitrine_detalhe?: string | null;
  vitrine_foto_url?: string | null;
  vitrine_estilo?: string | null;
  vitrine_cor1?: string | null;
  vitrine_cor2?: string | null;
  vitrine_cor_texto?: string | null;
};

export type Comunicacao = {
  local_id: string;
  headline: string | null;
  texto: string | null;
  oferta: string | null;
  cta: string;
  destino: string;
  imagem_url: string | null;
  // Rodada 140 — estilo do banner (destaque_chamada, migration 095). Vazio = degradê padrão e dizeres brancos.
  estilo?: 'degrade' | 'foto_metade' | 'foto_esquerda' | 'foto_fundo' | null;
  destaque_texto?: string | null;
  cor_destaque?: string | null;
  cor1?: string | null;
  cor2?: string | null;
  cor_texto?: string | null;
  // Rodada 141 — banner diferente por lugar: {'home': {...}, 'cat:bares': {...}} (destaque_chamada.variantes, migration 096).
  variantes?: Record<string, VarianteBanner> | null;
};
export type VarianteBanner = { chamada?: string | null; cta?: string | null; imagem_url?: string | null; estilo?: string | null; cor1?: string | null; cor2?: string | null; cor_texto?: string | null; destaque_texto?: string | null; cor_destaque?: string | null };

// Exemplo "Bares by Ambev" usado SÓ em desenvolvimento (Expo Go / __DEV__), quando o banco não devolve patrocínio de
// Bares — assim dá para ver o layout sem depender das migrations. Em produção (app publicado) nunca aparece.
const PATROCINIO_EXEMPLO_DEV: Patrocinio = {
  categoria: 'bares',
  local_id: null,
  tag: 'PATROCÍNIO · EXEMPLO (teste local)',
  titulo: 'Bares by Ambev',
  subtitulo:
    'A Ambev é a maior cervejaria do Brasil, com marcas como Skol, Brahma e Antarctica, presente em milhares de bares do país. Aqui, ela apoia a vida noturna que acolhe todo mundo.',
  cta: 'Saiba mais',
  destino: 'https://www.ambev.com.br',
  imagem_url: null,
  cor1: '#F59E0B',
  cor2: '#B45309',
};

export async function buscarPatrocinio(slug: string): Promise<Patrocinio | null> {
  // O exemplo "Bares by Ambev" saiu: sem patrocinador cadastrado, a vitrine mostra o espaço "Patrocínio Master" (lib/demo.ts).
  const exemploDev: Patrocinio | null = null;
  try {
    const { data, error } = await supabase
      .from('categoria_patrocinio')
      .select('categoria, local_id, tag, titulo, subtitulo, cta, destino, imagem_url, cor1, cor2, ativo, inicio, fim')
      .eq('categoria', slug)
      .maybeSingle();
    if (error) {
      if (__DEV__) console.warn('[patrocinio] erro ao ler categoria_patrocinio:', error.message);
      return exemploDev;
    }
    if (!data) {
      if (__DEV__) console.warn(`[patrocinio] nenhuma linha ativa para "${slug}" (rode a 064 no Supabase; o banco só devolve linhas ativas e dentro do período).`);
      return exemploDev;
    }
    // Conta da equipe enxerga também os desligados (política de admin): o app mostra só o que está no ar.
    const d = data as any; const agora = Date.now();
    if (d.ativo === false || (d.inicio && new Date(d.inicio).getTime() > agora) || (d.fim && new Date(d.fim).getTime() < agora)) return exemploDev;
    return data as Patrocinio;
  } catch (e: any) {
    if (__DEV__) console.warn('[patrocinio] falha:', e?.message);
    return exemploDev;
  }
}

// Ofertas = cupons ativos e dentro da validade, de locais aprovados da categoria (ou de uma lista de locais).
export async function buscarOfertas(opts: { categoriaReal?: string | string[] | null; idsLocais?: string[] }): Promise<OfertaVitrine[]> {
  try {
    const montar = (campos: string) => {
      let q: any = supabase
        .from('cupons')
        .select(`${campos}, locais!inner(id, nome, categoria, status, foto_capa_url, logo_url, plano_comercial, plano_comercial_status)`)
        .eq('ativo', true)
        .eq('locais.status', 'aprovado')
        .limit(60);
      if (Array.isArray(opts.categoriaReal)) q = q.in('locais.categoria', opts.categoriaReal);
      else if (opts.categoriaReal) q = q.eq('locais.categoria', opts.categoriaReal);
      if (opts.idsLocais) q = q.in('local_id', opts.idsLocais.length ? opts.idsLocais : ['00000000-0000-0000-0000-000000000000']);
      return q;
    };
    let r = await montar('id, local_id, titulo, descricao, valido_de, valido_ate, imagem_url, criado_pela_equipe, created_at, vitrine_oferta, vitrine_detalhe, vitrine_foto_url, vitrine_estilo, vitrine_cor1, vitrine_cor2, vitrine_cor_texto');
    if (r.error) r = await montar('id, local_id, titulo, descricao, valido_de, valido_ate, imagem_url, criado_pela_equipe, created_at'); // sem a 109
    if (r.error) r = await montar('id, local_id, titulo, descricao, valido_de, valido_ate, created_at');
    if (r.error || !r.data) return [];
    const agora = Date.now();
    return (r.data as any[])
      .filter((c) => (!c.valido_de || new Date(c.valido_de).getTime() <= agora) && (!c.valido_ate || new Date(c.valido_ate).getTime() >= agora))
      .map((c) => ({
        id: c.id,
        local_id: c.local_id,
        titulo: c.titulo,
        descricao: c.descricao ?? null,
        valido_ate: c.valido_ate ?? null,
        imagem_url: c.imagem_url ?? null,
        equipe: !!c.criado_pela_equipe,
        criado_em: c.created_at ?? null,
        vitrine_oferta: c.vitrine_oferta ?? null,
        vitrine_detalhe: c.vitrine_detalhe ?? null,
        vitrine_foto_url: c.vitrine_foto_url ?? null,
        vitrine_estilo: c.vitrine_estilo ?? null,
        vitrine_cor1: c.vitrine_cor1 ?? null,
        vitrine_cor2: c.vitrine_cor2 ?? null,
        vitrine_cor_texto: c.vitrine_cor_texto ?? null,
        nome_local: c.locais?.nome ?? '',
        foto_local: c.locais?.logo_url || c.locais?.foto_capa_url || null,
        plano_comercial: c.locais?.plano_comercial ?? null,
        plano_comercial_status: c.locais?.plano_comercial_status ?? null,
      }));
  } catch {
    return [];
  }
}

// Chamada do banner de destaque: prioridade para a chamada editável do local/equipe (destaque_chamada,
// migration 060); depois a frase do Membro Fundador (fundador_comunicacao). Cada tabela é opcional.
export async function buscarComunicacao(ids: string[]): Promise<Record<string, Comunicacao>> {
  if (ids.length === 0) return {};
  const mapa: Record<string, Comunicacao> = {};
  try {
    const { data, error } = await supabase
      .from('fundador_comunicacao')
      .select('local_id, headline, texto, oferta, cta, destino, imagem_url')
      .in('local_id', ids);
    if (!error && data) for (const r of data as any[]) mapa[r.local_id] = r as Comunicacao;
  } catch {
    // sem a tabela (migration 059): segue
  }
  try {
    let resp: any = await supabase
      .from('destaque_chamada')
      .select('local_id, chamada, cta, imagem_url, estilo, cor1, cor2, cor_texto, destaque_texto, cor_destaque, variantes')
      .in('local_id', ids);
    if (resp.error) resp = await supabase.from('destaque_chamada').select('local_id, chamada, cta, imagem_url, estilo, cor1, cor2, cor_texto, destaque_texto, cor_destaque').in('local_id', ids);
    // Sem a migration 095 (colunas de estilo): segue com o básico.
    if (resp.error) resp = await supabase.from('destaque_chamada').select('local_id, chamada, cta, imagem_url').in('local_id', ids);
    const { data, error } = resp;
    if (!error && data) {
      for (const r of data as any[]) {
        const base = mapa[r.local_id];
        mapa[r.local_id] = {
          local_id: r.local_id,
          headline: r.chamada,
          texto: base?.texto ?? null,
          oferta: base?.oferta ?? null,
          cta: r.cta || base?.cta || 'Conhecer',
          destino: base?.destino || '',
          imagem_url: r.imagem_url || base?.imagem_url || null,
          estilo: r.estilo ?? (r.imagem_url ? 'foto_metade' : null),
          cor1: r.cor1 ?? null,
          cor2: r.cor2 ?? null,
          cor_texto: r.cor_texto ?? null,
          destaque_texto: r.destaque_texto ?? null,
          cor_destaque: r.cor_destaque ?? null,
          variantes: r.variantes ?? null,
        };
      }
    }
  } catch {
    // sem a tabela (migration 060): segue
  }
  return mapa;
}

// Subcategorias desligadas no /admin (migration 065). Sem a tabela, nada é ocultado.
export async function buscarSubcategoriasDesligadas(categoria: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase.from('subcategoria_config').select('chave').eq('categoria', categoria).eq('ativo', false);
    if (error || !data) return new Set();
    return new Set((data as any[]).map((r) => r.chave as string));
  } catch {
    return new Set();
  }
}

// Estado manual das subcategorias no /admin (aba Categorias): linhas com chave "breve:<subcategoria>".
//   ativo = true  → "Em breve" (selo EM BREVE mesmo que já tenha locais)
//   ativo = false → "Ativada"  (sem selo, mesmo que ainda não tenha locais)
// Sem linha = automático (selo "em breve" só enquanto não há nenhum local).
export type EstadoSubcategorias = { breve: Set<string>; ativas: Set<string> };
export async function buscarEstadoSubcategorias(categoria: string): Promise<EstadoSubcategorias> {
  const vazio: EstadoSubcategorias = { breve: new Set(), ativas: new Set() };
  try {
    const { data, error } = await supabase.from('subcategoria_config').select('chave, ativo').eq('categoria', categoria).like('chave', 'breve:%');
    if (error || !data) return vazio;
    for (const r of data as any[]) {
      const chave = String(r.chave).slice('breve:'.length);
      (r.ativo ? vazio.breve : vazio.ativas).add(chave);
    }
    return vazio;
  } catch {
    return vazio;
  }
}

// Ids dos Membros Fundadores (selo real em local_badges), como na Home.
export async function buscarIdsFundadores(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('local_badges')
      .select('local_id, locais!inner(status)')
      .ilike('rotulo', '%fundador%')
      .eq('ativo', true)
      .eq('locais.status', 'aprovado')
      .limit(200);
    if (error || !data) return [];
    return Array.from(new Set((data as any[]).map((r) => r.local_id as string)));
  } catch {
    return [];
  }
}

// Medição anônima. Exibição é registrada uma vez por sessão e por seção/local.
const jaVistos = new Set<string>();
// Seções que são BANNER da casa (patrocínio e destaques Fundador/Premium). Ofertas/cupons ficam de fora.
const SECAO_BANNER = /^(patrocinio:|destaques:|home:destaques)/;

export function registrarVitrine(localId: string | null, secao: string, tipo: 'exibicao' | 'clique') {
  // Etapa 3 — o mesmo banner também conta no painel do parceiro (eventos_analytics, migração 098).
  if (localId && SECAO_BANNER.test(secao)) {
    if (tipo === 'exibicao') registrarVisualizacaoBanner(localId);
    else registrarCliqueBanner(localId);
  }
  try {
    if (tipo === 'exibicao') {
      const k = `${localId ?? '-'}|${secao}`;
      if (jaVistos.has(k)) return;
      jaVistos.add(k);
    }
    Promise.resolve(supabase.from('vitrine_eventos').insert({ local_id: localId, secao, tipo })).catch(() => {});
  } catch {
    // medição nunca atrapalha o uso do app
  }
}

// Texto de validade curto: "até 12/11".
export function ateData(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `até ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Vários patrocínios de uma vez (ex.: as 6 vagas "em-alta-1" … "em-alta-6" das páginas da Home). Chave ausente = vaga livre.
export async function buscarPatrociniosLote(chaves: string[]): Promise<Record<string, Patrocinio>> {
  try {
    const { data, error } = await supabase
      .from('categoria_patrocinio')
      .select('categoria, local_id, tag, titulo, subtitulo, cta, destino, imagem_url, cor1, cor2')
      .in('categoria', chaves);
    if (error || !data) return {};
    return Object.fromEntries((data as Patrocinio[]).map((p) => [p.categoria, p]));
  } catch {
    return {};
  }
}

// Vagas manuais do admin (migration 071): quem ocupa cada vaga Premium (1..12) e Intermediária (1..24) da categoria.
// Sem linha = vaga automática (o app preenche pelo plano). Em erro (migration ainda não rodou) devolve vazio.
export type VagasCategoria = { premium: Record<number, string>; intermediario: Record<number, string> };
export async function buscarVagas(slug: string): Promise<VagasCategoria> {
  const vazio: VagasCategoria = { premium: {}, intermediario: {} };
  try {
    const { data, error } = await supabase.from('vitrine_vaga').select('tipo, posicao, local_id').eq('categoria', slug);
    if (error || !data) return vazio;
    for (const r of data as any[]) (r.tipo === 'premium' ? vazio.premium : vazio.intermediario)[Number(r.posicao)] = r.local_id as string;
    return vazio;
  } catch {
    return vazio;
  }
}

// Nov/2026 — Duas coisas separadas no Modo equipe:
//   1) Nome da subcategoria no app (ícone redondo): mostrar/esconder — linha com a chave da subcategoria (065).
//   2) Página própria com banners: por subcategoria — linha 'pagina:<chave>' com ativo = true.
//      Ligada: tocar no ícone abre Bares › Botecos numa página só dela (Topo 1, 2 e 3 próprios).
//      Desligada: tocar no ícone só filtra a lista na página da categoria.
export async function buscarPaginasSub(categoriaReal: string): Promise<Set<string>> {
  try {
    const { data } = await supabase.from('subcategoria_config').select('chave, ativo').eq('categoria', categoriaReal).like('chave', 'pagina:%');
    return new Set(((data as any[]) || []).filter((r) => r.ativo).map((r) => String(r.chave).slice('pagina:'.length)));
  } catch {
    return new Set();
  }
}

// Nov/2026 — Topo 1 sem patrocinador: mostrar ou não o convite "Sua marca aqui", por página (Modo equipe).
// Linha em subcategoria_config: categoria = slug da página (bares, trip, destino-sao-paulo, bares--botecos…),
// chave '__vaga_livre', ativo = true (mostra) / false (esconde). Sem linha: não mostra (nov/2026).
// Nov/2026 — nenhuma página mostra o convite "Sua marca aqui" por padrão: só se a equipe ligar a Vaga livre no Modo equipe.
export const CONVITE_PADRAO_LIGADO = new Set<string>([]);
let cacheConvite: { em: number; mapa: Record<string, boolean> } | null = null;
export async function buscarConvitesVaga(semCache = false): Promise<Record<string, boolean>> {
  if (!semCache && cacheConvite && Date.now() - cacheConvite.em < 60_000) return cacheConvite.mapa;
  try {
    const { data } = await supabase.from('subcategoria_config').select('categoria, ativo').eq('chave', '__vaga_livre');
    const mapa: Record<string, boolean> = {};
    for (const r of ((data as any[]) || [])) mapa[r.categoria] = !!r.ativo;
    cacheConvite = { em: Date.now(), mapa };
    return mapa;
  } catch {
    return {};
  }
}
export const conviteLigado = (mapa: Record<string, boolean>, slug: string) => (slug in mapa ? mapa[slug] : CONVITE_PADRAO_LIGADO.has(slug));
