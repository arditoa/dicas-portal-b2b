// Opções do perfil opcional (cadastro em passos e Conta). Tudo é opcional e existe sempre
// "Prefiro não informar". Orientação e identidade são dados sensíveis (LGPD art. 11).
export const NAO_INFORMAR = 'Prefiro não informar';

export const ORIENTACOES = ['Lésbica', 'Gay', 'Bissexual', 'Pansexual', 'Assexual', 'Heterossexual', 'Outra', NAO_INFORMAR];
export const IDENTIDADES = ['Mulher cis', 'Mulher trans', 'Homem cis', 'Homem trans', 'Pessoa não binária', 'Travesti', 'Outra', NAO_INFORMAR];
export const PRONOMES = ['Ela/dela', 'Ele/dele', 'Elu/delu', 'Qualquer um', NAO_INFORMAR];
export const STATUS_OPCOES: { valor: string; rotulo: string }[] = [
  { valor: 'solteiro', rotulo: 'Solteire' },
  { valor: 'aberto', rotulo: 'Aberte' },
  { valor: 'comprometido', rotulo: 'Comprometide' },
  { valor: 'nao_informado', rotulo: NAO_INFORMAR },
];

export type ExtrasCadastro = {
  orientacao?: string;
  identidade?: string;
  pronomes?: string;
  status?: string;
  consentimento: boolean;
  gostos: { musica: string[]; experiencia: string[]; publico: string[] };
};

export const EXTRAS_VAZIO: ExtrasCadastro = { consentimento: false, gostos: { musica: [], experiencia: [], publico: [] } };
