// Opções do perfil opcional (cadastro em passos e Conta). Tudo é opcional e existe sempre
// "Prefiro não informar". Orientação e identidade são dados sensíveis (LGPD art. 11).
export const NAO_INFORMAR = 'Prefiro não informar';

export const ORIENTACOES = ['Lésbica', 'Gay', 'Bissexual', 'Pansexual', 'Assexual', 'Heterossexual', 'Outra', NAO_INFORMAR];
export const IDENTIDADES = ['Mulher cis', 'Mulher trans', 'Homem cis', 'Homem trans', 'Pessoa não binária', 'Travesti', 'Outra', NAO_INFORMAR];
export const PRONOMES = ['Ela/dela', 'Ele/dele', 'Elu/delu', 'Qualquer um', NAO_INFORMAR];
// Pode marcar mais de uma (ex.: Casado(a) + Quem sabe, uma bagunça). Lista vazia = prefere não informar.
export const STATUS_OPCOES: { valor: string; rotulo: string }[] = [
  { valor: 'solteiro', rotulo: 'Solteiro(a)' },
  { valor: 'namorando', rotulo: 'Namorando' },
  { valor: 'casado', rotulo: 'Casado(a)' },
  { valor: 'aberto', rotulo: 'Relacionamento aberto' },
  { valor: 'bagunca', rotulo: 'Quem sabe, uma bagunça' },
  { valor: 'nao_informado', rotulo: NAO_INFORMAR },
];

// Valor equivalente na coluna antiga (enum status_relacionamento), mantida por compatibilidade.
export function statusLegado(lista: string[]): string {
  if (lista.includes('solteiro')) return 'solteiro';
  if (lista.includes('aberto')) return 'aberto';
  if (lista.includes('namorando') || lista.includes('casado')) return 'comprometido';
  return 'nao_informado';
}

// Converte o valor antigo (enum) para a lista nova, quando a pessoa ainda não escolheu na lista.
export function statusDoLegado(valor?: string | null): string[] {
  if (valor === 'solteiro') return ['solteiro'];
  if (valor === 'aberto') return ['aberto'];
  if (valor === 'comprometido') return ['namorando'];
  return [];
}

export type ExtrasCadastro = {
  orientacao?: string;
  identidade?: string;
  pronomes?: string;
  status?: string[];
  consentimento: boolean;
  gostos: { musica: string[]; experiencia: string[]; publico: string[] };
};

export const EXTRAS_VAZIO: ExtrasCadastro = { consentimento: false, gostos: { musica: [], experiencia: [], publico: [] } };
