// portal-cadastro/src/lib/api.ts

const BASE_URL = 'https://dicas-portal-backend.onrender.com/api/partners';

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

// Verifica se o CPF/CNPJ já existe
export async function verificarDocumentoDuplicado(
  documento: string
): Promise<boolean> {
  try {
    const resposta = await fetch(
      `${BASE_URL}/check-duplicate?documento=${encodeURIComponent(documento)}`
    );

    if (!resposta.ok) {
      return false;
    }

    const dados = await resposta.json();
    return dados.exists || false;
  } catch (error) {
    console.error('Erro na verificação de documento:', error);
    return false;
  }
}

// Função com o nome exato esperado pelo CadastroParceiroForm.tsx
export async function enviarCadastroParceiro(
  payload: CadastroParceiroPayload
): Promise<{ success: boolean; message?: string }> {
  try {
    const resposta = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resposta.ok) {
      throw new Error(`Erro na API: ${resposta.status}`);
    }

    const dados = await resposta.json();
    return { success: true, message: dados.message };
  } catch (error) {
    console.error('Falha ao enviar cadastro:', error);
    return { success: false, message: 'Não foi possível conectar ao servidor.' };
  }
}