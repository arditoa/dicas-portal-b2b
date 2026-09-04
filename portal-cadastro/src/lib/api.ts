// lib/api.ts
// Chamadas para a API backend.

const BASE_URL = 'https://dicas-portal-backend.onrender.com';

export interface CadastroParceiroPayload {
  documento: string;
  nomeResponsavel: string;
  whatsapp: string;
  nomeEspaco: string;
  categoria: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  aceitouTermos: boolean;
  origemLead?: 'whatsapp' | 'portal';
}

export async function verificarDocumentoDuplicado(documento: string): Promise<boolean> {
  const resposta = await fetch(`${BASE_URL}/check-duplicate?documento=${documento}`);
  if (!resposta.ok) {
    return false;
  }
  const dado = await resposta.json();
  return Boolean(dado.existe);
}

export async function enviarCadastroParceiro(payload: CadastroParceiroPayload): Promise<{ id: string }> {
  const resposta = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao enviar cadastro (${resposta.status})`);
  }
  return resposta.json();
}