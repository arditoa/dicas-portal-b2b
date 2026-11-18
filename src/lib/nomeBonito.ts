// Nov/2026 (18/11) — Bairro e cidade sempre no mesmo formato no app ("Jardim Paulista", "República", "Consolação"),
// venha o cadastro como vier ("REPUBLICA", "republica", "CONSOLACAO"). O banco faz o mesmo ao salvar (migração 159).
import { normTxt } from './subcategorias';

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no']);
// Acentos dos nomes mais comuns (cadastros sem acento). A chave é sem acento e minúscula.
const ACENTOS: Record<string, string> = {
  republica: 'República', consolacao: 'Consolação', 'sao paulo': 'São Paulo', 'santa cecilia': 'Santa Cecília', paraiso: 'Paraíso',
  'vila clementino': 'Vila Clementino', 'bela vista': 'Bela Vista', 'jardim paulista': 'Jardim Paulista', 'cerqueira cesar': 'Cerqueira César',
  'pinheiros': 'Pinheiros', 'vila madalena': 'Vila Madalena', 'liberdade': 'Liberdade', 'se': 'Sé', 'bras': 'Brás', 'butanta': 'Butantã',
  'santo amaro': 'Santo Amaro', 'moema': 'Moema', 'itaim bibi': 'Itaim Bibi', 'barra funda': 'Barra Funda', 'agua branca': 'Água Branca',
  'balneario camboriu': 'Balneário Camboriú', 'goiania': 'Goiânia', 'brasilia': 'Brasília', 'florianopolis': 'Florianópolis', 'sao jose': 'São José',
  'copacabana': 'Copacabana', 'ipanema': 'Ipanema', 'botafogo': 'Botafogo', 'leblon': 'Leblon', 'lapa': 'Lapa', 'guaruja': 'Guarujá',
  'campos do jordao': 'Campos do Jordão', 'santa rita do sapucai': 'Santa Rita do Sapucaí', 'palmas': 'Palmas', 'plano diretor sul': 'Plano Diretor Sul',
  'plano diretor norte': 'Plano Diretor Norte', 'pompeia': 'Pompeia', 'perdizes': 'Perdizes', 'higienopolis': 'Higienópolis',
  'vila mariana': 'Vila Mariana', 'tatuape': 'Tatuapé', 'mooca': 'Mooca', 'centro': 'Centro', 'jardins': 'Jardins', 'augusta': 'Augusta',
};

export function nomeBonito(s?: string | null): string {
  const t = (s || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const chave = normTxt(t);
  if (ACENTOS[chave]) return ACENTOS[chave];
  // Já veio bem escrito (tem minúsculas e maiúsculas): mantém.
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t.toLowerCase().split(' ').map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}
