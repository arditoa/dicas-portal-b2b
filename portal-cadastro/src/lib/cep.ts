// lib/cep.ts
// Autopreenchimento de endereço por CEP.

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function formatarCEP(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 8);
  return digitos.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

export interface EnderecoViaCEP {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export class CepNaoEncontradoError extends Error {}

export async function buscarEnderecoPorCEP(cepOuDigitos: string): Promise<EnderecoViaCEP> {
  const digitos = apenasDigitos(cepOuDigitos);
  if (digitos.length !== 8) {
    throw new Error('CEP precisa ter 8 dígitos');
  }

  const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
  if (!resposta.ok) {
    throw new Error(`ViaCEP respondeu ${resposta.status}`);
  }

  const dado = await resposta.json();
  if (dado.erro) {
    throw new CepNaoEncontradoError('CEP não encontrado');
  }

  return {
    logradouro: dado.logradouro ?? '',
    bairro: dado.bairro ?? '',
    cidade: dado.localidade ?? '',
    uf: dado.uf ?? '',
  };
}