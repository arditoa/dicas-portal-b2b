// Rodada 69 — Experiências e roteiros (tabelas roteiros / roteiro_paradas /
// roteiros_salvos, migration 039). Enquanto a migration não roda, o app usa
// o roteiro de exemplo abaixo, para a página nunca aparecer vazia.
import { supabase } from './supabase';
import { GRUPOS_ROTEIRO, ROTEIRO_MAX_TAGS_VISIVEIS, slugTag } from './taxonomia';

export type Parada = {
  id: string;
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

export type Roteiro = {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  cidade: string;
  uf: string | null;
  destino_slug: string | null;
  foto_url: string | null;
  foto_credito?: string | null;
  formato: string;
  duracao: string | null;
  duracao_texto: string | null;
  preco_texto: string | null;
  link_reserva: string | null;
  tags: Record<string, string[]>;
  tags_principais: string[];
  destaque: boolean;
  ordem: number;
  paradas_qtd?: number;
  paradas?: Parada[];
};

export const ROTEIRO_EXEMPLO: Roteiro = {
  id: 'exemplo-sp-1-dia',
  slug: 'sao-paulo-lgbt-em-1-dia',
  titulo: 'São Paulo LGBT+ em 1 dia',
  subtitulo: 'Cultura, história, gastronomia e vida noturna em um roteiro para viver a cidade por inteiro.',
  descricao:
    'Do coração cultural da Paulista aos lugares que contam a história LGBT+ do centro, terminando nos bares e casas mais animados da cidade. Dá para fazer tudo a pé e de metrô.',
  cidade: 'São Paulo',
  uf: 'SP',
  destino_slug: 'sao-paulo',
  foto_url: null,
  formato: 'roteiro_completo',
  duracao: '1_dia',
  duracao_texto: '1 dia',
  preco_texto: 'Grátis (consumo à parte)',
  link_reserva: null,
  tags: {
    formato: ['roteiro_completo', 'autoguiado'],
    duracao: ['1_dia'],
    tema: ['cultura', 'historia', 'gastronomia', 'vida_noturna', 'turismo_urbano'],
    lgbt: ['historia_lgbt', 'locais_historicos_lgbt', 'vida_noturna_lgbt', 'bares_lgbt'],
    publico: ['todos_os_publicos', 'turistas'],
    perfil: ['viagem_solo', 'amigos', 'casais', 'primeira_viagem'],
    horario: ['manha', 'tarde', 'noite'],
    deslocamento: ['a_pe', 'metro', 'sem_carro'],
    entrada: ['gratis'],
    comercial: ['curadoria_dicas'],
  },
  tags_principais: ['1_dia', 'cultura', 'historia_lgbt', 'gastronomia', 'vida_noturna_lgbt', 'a_pe', 'metro', 'gratis'],
  destaque: true,
  ordem: 1,
  paradas_qtd: 4,
  paradas: [
    { id: 'p1', ordem: 1, horario: '10h', titulo: 'Avenida Paulista e MASP', descricao: 'Arte, diversidade e o coração cultural de São Paulo. Aos domingos a avenida fecha para carros.', foto_url: null, local_id: null, endereco: 'Av. Paulista, 1578 — Bela Vista', lat: -23.5614, lng: -46.6559 },
    { id: 'p2', ordem: 2, horario: '13h', titulo: 'Almoço na região da República', descricao: 'Gastronomia diversa, bares e cafés em um dos bairros mais autênticos da cidade.', foto_url: null, local_id: null, endereco: 'Praça da República — República', lat: -23.5432, lng: -46.6425 },
    { id: 'p3', ordem: 3, horario: '16h', titulo: 'Arouche e Bento Freitas', descricao: 'História, resistência e vida LGBT+ em lugares icônicos do centro.', foto_url: null, local_id: null, endereco: 'Largo do Arouche — República', lat: -23.5413, lng: -46.6455 },
    { id: 'p4', ordem: 4, horario: '20h', titulo: 'Bar e vida noturna LGBT+', descricao: 'Drinks, música e encontros nos bares e casas mais incríveis da cidade.', foto_url: null, local_id: null, endereco: 'Rua Augusta / Frei Caneca — Consolação', lat: -23.5535, lng: -46.656 },
  ],
};

const CAMPOS =
  'id, slug, titulo, subtitulo, descricao, cidade, uf, destino_slug, foto_url, foto_credito, formato, duracao, duracao_texto, preco_texto, link_reserva, tags, tags_principais, destaque, ordem, roteiro_paradas(count)';

export async function listarRoteiros(): Promise<{ roteiros: Roteiro[]; exemplo: boolean }> {
  try {
    const { data, error } = await supabase.from('roteiros').select(CAMPOS).eq('status', 'publicado').order('destaque', { ascending: false }).order('ordem');
    if (error) return { roteiros: [ROTEIRO_EXEMPLO], exemplo: true };
    const lista = ((data as any[]) || []).map((r) => ({
      ...r,
      tags: r.tags || {},
      tags_principais: r.tags_principais || [],
      paradas_qtd: r.roteiro_paradas?.[0]?.count ?? 0,
    })) as Roteiro[];
    return lista.length ? { roteiros: lista, exemplo: false } : { roteiros: [ROTEIRO_EXEMPLO], exemplo: true };
  } catch {
    return { roteiros: [ROTEIRO_EXEMPLO], exemplo: true };
  }
}

export async function buscarRoteiro(slug: string): Promise<Roteiro | null> {
  try {
    const { data, error } = await supabase
      .from('roteiros')
      .select(`${CAMPOS.replace(', roteiro_paradas(count)', '')}, roteiro_paradas(id, ordem, horario, titulo, descricao, foto_url, local_id, endereco, lat, lng)`)
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return slug === ROTEIRO_EXEMPLO.slug ? ROTEIRO_EXEMPLO : null;
    const r: any = data;
    const paradas = ((r.roteiro_paradas as Parada[]) || []).sort((a, b) => a.ordem - b.ordem);
    return { ...r, tags: r.tags || {}, tags_principais: r.tags_principais || [], paradas, paradas_qtd: paradas.length };
  } catch {
    return slug === ROTEIRO_EXEMPLO.slug ? ROTEIRO_EXEMPLO : null;
  }
}

// Todas as tags do roteiro (para filtros), sem grupo.
export function todasTags(r: Roteiro): string[] {
  return Object.values(r.tags || {}).flat();
}

// Tags principais visíveis no card: as escolhidas (máx. 8). Se o cadastro
// não escolheu, monta com duração + temas + LGBT+ + deslocamento.
export function tagsVisiveis(r: Roteiro, max = ROTEIRO_MAX_TAGS_VISIVEIS): string[] {
  if (r.tags_principais?.length) return r.tags_principais.slice(0, max);
  const ordem = ['duracao', 'tema', 'lgbt', 'deslocamento', 'entrada'];
  return ordem.flatMap((g) => r.tags?.[g] || []).slice(0, max);
}

export function ehRoteiroCompleto(r: Roteiro): boolean {
  return r.formato === 'roteiro_completo' || r.formato === 'circuito';
}

export function opcoesDoGrupo(id: string): string[] {
  return (GRUPOS_ROTEIRO.find((g) => g.id === id)?.tags || []).map(slugTag);
}

// Link do Google Maps com o trajeto passando por todas as paradas.
export function linkMapaRoteiro(paradas: Parada[]): string | null {
  const pts = paradas.filter((p) => p.lat != null && p.lng != null).map((p) => `${p.lat},${p.lng}`);
  if (pts.length === 0) return null;
  if (pts.length === 1) return `https://www.google.com/maps/search/?api=1&query=${pts[0]}`;
  const origem = pts[0];
  const destino = pts[pts.length - 1];
  const meio = pts.slice(1, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}${meio ? `&waypoints=${encodeURIComponent(meio)}` : ''}&travelmode=walking`;
}
