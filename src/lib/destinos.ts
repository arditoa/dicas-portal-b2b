// Destinos do Dicas Trip. A fonte oficial é a tabela `destinos` (migration
// 036, gerida pela equipe no Supabase/admin); esta lista é o padrão usado
// enquanto a tabela não existe ou está vazia — e o texto em EN/ES.
//
// Quando houver muitas cidades em vários estados, o "Destinos em destaque"
// vira "Estados" e cada estado abre suas cidades: é só agrupar por `uf`.
import { supabase } from './supabase';

export type Destino = {
  slug: string;
  cidade: string;
  uf: string;
  vibe: { pt: string; en: string; es: string };
  descricao?: string | null;
  foto_url?: string | null;
  foto_credito?: string | null;
  tags: string[];
  melhor_epoca: string[];
  melhor_epoca_texto?: string | null;
  roteiro_titulo?: string | null;
  roteiro_resumo?: string | null;
  roteiro_link?: string | null;
  evento?: boolean; // migration 156: evento especial (Carnaval, Copa…) na grade de Roteiros
  selo?: string | null; // migration 156: selo de data do evento (ex.: "FEV 2027")
  aberto?: boolean; // migration 149: Aberto (true) ou Em breve (false), pelo Modo equipe
  ativo?: boolean;
};

export const DESTINOS_PADRAO: Destino[] = [
  { slug: 'sao-paulo', cidade: 'São Paulo', uf: 'SP',
    vibe: { pt: 'São Paulo com orgulho', en: 'São Paulo with pride', es: 'São Paulo con orgullo' },
    tags: ['cultura', 'gastronomia', 'vida_noturna', 'compras', 'destino_lgbt', 'destino_urbano'],
    melhor_epoca: ['parada_lgbt', 'temporada_cultural', 'temporada_de_festas'] },
  { slug: 'rio-de-janeiro', cidade: 'Rio de Janeiro', uf: 'RJ',
    vibe: { pt: 'Verão, praia e muito sol', en: 'Summer, beach and lots of sun', es: 'Verano, playa y mucho sol' },
    tags: ['praia', 'cultura', 'vida_noturna', 'natureza', 'destino_lgbt'],
    melhor_epoca: ['verao', 'carnaval', 'reveillon', 'temporada_de_praias'] },
  { slug: 'campos-do-jordao', cidade: 'Campos do Jordão', uf: 'SP',
    vibe: { pt: 'Romântica e afetuosa', en: 'Romantic and cozy', es: 'Romántica y acogedora' },
    tags: ['romance', 'natureza', 'gastronomia', 'bem_estar'],
    melhor_epoca: ['inverno', 'alta_temporada', 'festivais'] },
  { slug: 'santa-rita-do-sapucai', cidade: 'Santa Rita do Sapucaí', uf: 'MG',
    vibe: { pt: 'Tecnologia e comunidade', en: 'Technology and community', es: 'Tecnología y comunidad' },
    tags: ['cultura', 'natureza', 'amigos'],
    melhor_epoca: ['eventos_especiais'] },
  { slug: 'guaruja', cidade: 'Guarujá', uf: 'SP',
    vibe: { pt: 'Praticidade e descanso', en: 'Easy getaway and rest', es: 'Practicidad y descanso' },
    tags: ['praia', 'bem_estar', 'familia', 'amigos'],
    melhor_epoca: ['verao', 'temporada_de_praias'] },
  { slug: 'vinhedo', cidade: 'Vinhedo', uf: 'SP',
    vibe: { pt: 'Vinhos e cultura', en: 'Wine and culture', es: 'Vinos y cultura' },
    tags: ['gastronomia', 'cultura', 'romance'],
    melhor_epoca: ['outono', 'inverno', 'festivais'] },
];

// Cidades abertas no app (nov/2026): só São Paulo. As demais aparecem como "Em breve"
// (toque registra o "avise-me"). Para abrir outra cidade, inclua o slug aqui.
export const DESTINOS_ABERTOS = ['sao-paulo'];
export const destinoAberto = (slug: string) => DESTINOS_ABERTOS.includes(slug);
// Com a 149, vale o que a equipe marcou no Modo equipe; sem ela, a lista fixa acima.
export const estaAberto = (d: Pick<Destino, 'slug' | 'aberto'>) => (typeof d.aberto === 'boolean' ? d.aberto : destinoAberto(d.slug));
// Nov/2026 (18/11): eventos especiais primeiro, depois cidades abertas, depois as "em breve" (mantém a ordem da equipe).
export const ordenarDestinos = (lista: Destino[]) =>
  lista.slice().sort((a, b) => Number(!!b.evento) - Number(!!a.evento) || Number(estaAberto(b)) - Number(estaAberto(a)));

// Junta o que está na tabela com o padrão (tabela manda; tradução EN/ES do
// padrão é mantida quando a cidade é a mesma).
export async function carregarDestinos(): Promise<Destino[]> {
  try {
    const CAMPOS = 'slug, cidade, uf, vibe, descricao, foto_url, tags, melhor_epoca, melhor_epoca_texto, roteiro_titulo, roteiro_resumo, roteiro_link, ordem';
    const consultar = (campos: string) => supabase.from('destinos').select(campos).eq('ativo', true).order('ordem', { ascending: true });
    // foto_credito vem da migration 038; sem ela, segue sem o crédito.
    let { data, error }: { data: any; error: any } = await consultar(`${CAMPOS}, foto_credito, aberto, evento, selo`);
    if (error) ({ data, error } = await consultar(`${CAMPOS}, foto_credito, aberto`)); // sem a 156
    if (error) ({ data, error } = await consultar(`${CAMPOS}, foto_credito`));
    if (error) ({ data, error } = await consultar(CAMPOS));
    if (error || !data || data.length === 0) return DESTINOS_PADRAO;
    return (data as any[]).map((d) => {
      const padrao = DESTINOS_PADRAO.find((p) => p.slug === d.slug);
      const vibePt = d.vibe ? d.vibe.charAt(0).toUpperCase() + d.vibe.slice(1) : padrao?.vibe.pt || '';
      return {
        ...d,
        vibe: padrao && padrao.vibe.pt.toLowerCase() === vibePt.toLowerCase()
          ? padrao.vibe
          : { pt: vibePt, en: vibePt, es: vibePt },
        tags: d.tags || [],
        melhor_epoca: d.melhor_epoca || [],
      } as Destino;
    });
  } catch {
    return DESTINOS_PADRAO;
  }
}

// Nov/2026 — Na página de um destino (ex.: São Paulo), banner rotativo e cupons são só das CASAS DE VIAGEM:
// categoria Turismo, casas com Turismo como categoria extra (ex.: Museu da Diversidade) ou hospedagens.
// Bares, festas etc. da cidade continuam nas categorias deles e na Home, sem repetir na Trip.
export async function buscarExtrasTurismo(): Promise<Set<string>> {
  try {
    const { data } = await supabase.from('local_categorias_extra').select('local_id').eq('categoria', 'turismo');
    return new Set(((data as { local_id: string }[]) || []).map((x) => x.local_id));
  } catch {
    return new Set();
  }
}
export const ehCasaDeViagem = (l: { id: string; categoria?: string | null; tipo_hospedagem?: string | null }, extrasTurismo: Set<string>) =>
  l.categoria === 'turismo' || extrasTurismo.has(l.id) || !!l.tipo_hospedagem;
