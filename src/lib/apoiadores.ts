// Membros Apoiadores (apoio cultural) — conteúdo das páginas internas.
// Só entra aqui informação CONFIRMADA ou aprovada pela própria instituição.
// Campos opcionais vazios (site, instagram, endereco, horarios) não aparecem
// no app: preencha quando o parceiro enviar e aprovar.
import type { Idioma } from './i18n';

type Tx = Record<Idioma, string>;

export type Apoiador = {
  slug: string;
  nome: string;
  cores: [string, string];
  icone: string; // Feather
  tag: Tx;
  resumo: Tx;
  sobre: Tx;
  programas: { icone: string; titulo: Tx; texto: Tx }[];
  buscaMapa: string; // texto buscado no mapa (rota)
  site?: string;
  instagram?: string;
  endereco?: string;
  horarios?: Tx;
  logoUrl?: string;
  // Foto do espaço (aparece no topo da página). Preencher quando o parceiro enviar a foto.
  fotoUrl?: string;
  // Chamada principal da página (ex.: "Visite o Museu").
  chamada: Tx;
  // Mostrar a lista de programas? Por enquanto só foto + chamada + rota.
  mostrarProgramas?: boolean;
};

export const APOIADORES: Record<string, Apoiador> = {
  'museu-diversidade': {
    slug: 'museu-diversidade',
    nome: 'Museu da Diversidade Sexual',
    cores: ['#6D28D9', '#DB2777'],
    icone: 'book-open',
    tag: { pt: 'APOIO CULTURAL', en: 'CULTURAL SUPPORTER', es: 'APOYO CULTURAL' },
    chamada: { pt: 'Visite o Museu', en: 'Visit the Museum', es: 'Visita el Museo' },
    resumo: {
      pt: 'Um espaço que preserva e valoriza a arte, a cultura e as histórias da comunidade LGBTQIA+.',
      en: 'A space that preserves and celebrates the art, culture and stories of the LGBTQIA+ community.',
      es: 'Un espacio que preserva y valora el arte, la cultura y las historias de la comunidad LGBTQIA+.',
    },
    sobre: {
      pt: 'Onde a cultura é viva, a diversidade é protagonista.',
      en: 'Where culture is alive, diversity takes center stage.',
      es: 'Donde la cultura está viva, la diversidad es protagonista.',
    },
    programas: [
      {
        icone: 'book',
        titulo: { pt: 'Clube do Livro', en: 'Book Club', es: 'Club de Lectura' },
        texto: { pt: 'Encontros de leitura e conversa sobre literatura LGBT+.', en: 'Reading and discussion meetings on LGBTQ+ literature.', es: 'Encuentros de lectura y conversación sobre literatura LGBT+.' },
      },
      {
        icone: 'film',
        titulo: { pt: 'Cine Clube', en: 'Film Club', es: 'Cine Club' },
        texto: { pt: 'Sessões de filmes seguidas de debate.', en: 'Film screenings followed by discussion.', es: 'Proyecciones de películas seguidas de debate.' },
      },
      {
        icone: 'map',
        titulo: { pt: 'Rolezinho', en: 'Rolezinho walks', es: 'Rolezinho' },
        texto: { pt: 'Caminhadas pela história LGBT+ do centro de São Paulo.', en: 'Walks through the LGBTQ+ history of downtown São Paulo.', es: 'Caminatas por la historia LGBT+ del centro de São Paulo.' },
      },
      {
        icone: 'briefcase',
        titulo: { pt: 'Empreendedorismo e Formação', en: 'Entrepreneurship & Training', es: 'Emprendimiento y Formación' },
        texto: { pt: 'Centro de formação e apoio a quem empreende na comunidade.', en: 'Training hub supporting entrepreneurs in the community.', es: 'Centro de formación y apoyo a emprendedores de la comunidad.' },
      },
    ],
    buscaMapa: 'Museu da Diversidade Sexual São Paulo',
  },
};
