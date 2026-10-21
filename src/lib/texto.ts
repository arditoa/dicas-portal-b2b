// Rodada 78 — acabamento de textos vindos do cadastro (só para EXIBIR; o banco
// não é alterado). Muita gente cadastra o nome do negócio ou a cidade em
// MAIÚSCULAS e sem acento ("SAO PAULO"). Se o texto não tem nenhuma letra
// minúscula, mostramos em formato de título; se já tem minúsculas, respeitamos
// do jeito que o dono escreveu (ex.: "DJ Pri", "iFood").
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'a', 'o', 'para', 'com']);
const SIGLAS = new Set(['LTDA', 'ME', 'EPP', 'MEI', 'DJ', 'LGBT', 'LGBT+', 'LGBTQIA+', 'SP', 'RJ', 'BH', 'ONG']);

const CIDADES_COM_ACENTO: Record<string, string> = {
  'SAO PAULO': 'São Paulo',
  'BRASILIA': 'Brasília',
  'GOIANIA': 'Goiânia',
  'BELEM': 'Belém',
  'CURITIBA': 'Curitiba',
  'FLORIANOPOLIS': 'Florianópolis',
  'VITORIA': 'Vitória',
  'MACEIO': 'Maceió',
  'SAO LUIS': 'São Luís',
  'JOAO PESSOA': 'João Pessoa',
  'CUIABA': 'Cuiabá',
  'PORTO VELHO': 'Porto Velho',
  'FORTALEZA': 'Fortaleza',
  'ARACAJU': 'Aracaju',
  'SAO JOSE DOS CAMPOS': 'São José dos Campos',
  'SAO BERNARDO DO CAMPO': 'São Bernardo do Campo',
  'SANTO ANDRE': 'Santo André',
  'RIBEIRAO PRETO': 'Ribeirão Preto',
  'PIRENOPOLIS': 'Pirenópolis',
  'ALTO PARAISO DE GOIAS': 'Alto Paraíso de Goiás',
};

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function temMinuscula(s: string): boolean {
  return /[a-zà-ÿ]/.test(s);
}

function emTitulo(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((p, i) => {
      if (/^\s+$/.test(p) || !p) return p;
      const maiusc = p.toUpperCase();
      if (SIGLAS.has(maiusc)) return maiusc;
      if (i > 0 && MINUSCULAS.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join('');
}

/** Nome de negócio/local: só reformata quando veio inteiro em maiúsculas. */
export function formatarNome(nome?: string | null): string {
  const s = (nome ?? '').trim();
  if (!s) return '';
  return temMinuscula(s) ? s : emTitulo(s);
}

/** Cidade/bairro: corrige maiúsculas e devolve com acento quando conhece a cidade. */
export function formatarCidade(cidade?: string | null): string {
  const s = (cidade ?? '').trim();
  if (!s) return '';
  const chave = semAcento(s).toUpperCase();
  if (CIDADES_COM_ACENTO[chave]) return CIDADES_COM_ACENTO[chave];
  return temMinuscula(s) ? s : emTitulo(s);
}
