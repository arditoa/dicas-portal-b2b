// lib/lookupCnpj.ts
// Autopreenchimento por CNPJ via BrasilAPI.

export interface DadosCNPJ {
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export class CnpjNaoEncontradoError extends Error {}

function mapearRespostaBrasilAPI(dado: any): DadosCNPJ {
  return {
    razaoSocial: dado.razao_social ?? '',
    nomeFantasia: dado.nome_fantasia || dado.razao_social || '',
    situacaoCadastral: dado.descricao_situacao_cadastral ?? '',
    cep: dado.cep ?? '',
    logradouro: [dado.descricao_tipo_de_logradouro, dado.logradouro].filter(Boolean).join(' ').trim(),
    bairro: dado.bairro ?? '',
    cidade: dado.municipio ?? '',
    uf: dado.uf ?? '',
  };
}

async function buscarNaBrasilAPI(cnpj: string): Promise<DadosCNPJ> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (resposta.status === 404) {
    throw new CnpjNaoEncontradoError('CNPJ não encontrado');
  }
  if (!resposta.ok) {
    throw new Error(`BrasilAPI respondeu ${resposta.status}`);
  }
  return mapearRespostaBrasilAPI(await resposta.json());
}

async function buscarViaBackend(cnpj: string): Promise<DadosCNPJ> {
  const resposta = await fetch(`/api/partners/lookup-cnpj/${cnpj}`);
  if (resposta.status === 404) {
    throw new CnpjNaoEncontradoError('CNPJ não encontrado');
  }
  if (!resposta.ok) {
    throw new Error(`Lookup do backend respondeu ${resposta.status}`);
  }
  return resposta.json();
}

export async function buscarDadosCNPJ(cnpj: string): Promise<DadosCNPJ> {
  try {
    return await buscarNaBrasilAPI(cnpj);
  } catch (erro) {
    if (erro instanceof CnpjNaoEncontradoError) throw erro;
    return buscarViaBackend(cnpj);
  }
}