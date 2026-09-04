let tokenAtual: string | null = null;

export function definirTokenSessao(token: string | null) {
  tokenAtual = token;
}

export function temSessaoAtiva(): boolean {
  return tokenAtual !== null;
}

export async function authFetch(url: string, opcoes: RequestInit = {}): Promise<Response> {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      ...opcoes.headers,
      Authorization: tokenAtual ? `Bearer ${tokenAtual}` : '',
    },
  });

  if (resposta.status === 401) {
    definirTokenSessao(null);
  }

  return resposta;
}
