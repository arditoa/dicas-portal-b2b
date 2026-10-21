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

// Junta o que está na tabela com o padrão (tabela manda; tradução EN/ES do
// padrão é mantida quando a cidade é a mesma).
export async function carregarDestinos(): Promise<Destino[]> {
  try {
    const CAMPOS = 'slug, cidade, uf, vibe, descricao, foto_url, tags, melhor_epoca, melhor_epoca_texto, roteiro_titulo, roteiro_resumo, roteiro_link, ordem';
    const consultar = (campos: string) => supabase.from('destinos').select(campos).eq('ativo', true).order('ordem', { ascending: true });
    // foto_credito vem da migration 038; sem ela, segue sem o crédito.
    let { data, error }: { data: any; error: any } = await consultar(`${CAMPOS}, foto_credito`);
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
