// portal-cadastro/src/lib/partner.ts

const BASE_URL = 'https://dicas-portal-backend.onrender.com/api/partners';

export interface CadastrarPartnerPayload {
  nome_responsavel: string;
  cpf_ou_cnpj: string;
  whatsapp_comercial: string;
  aceitouTermos: boolean;
}

export interface CadastrarPartnerResposta {
  success: boolean;
  partnerId?: string;
  status?: string;
  message?: string;
}

/**
 * Envia os dados do Passo 1 do cadastro para o backend Fastify.
 * Cria o registro inicial com status 'rascunho'.
 */
export async function enviarPasso1(
  payload: CadastrarPartnerPayload
): Promise<CadastrarPartnerResposta> {
  try {
    const resposta = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.error || `Erro HTTP: ${resposta.status}`);
    }

    return {
      success: true,
      partnerId: dados.partnerId,
      status: dados.status,
      message: dados.message,
    };
  } catch (error: any) {
    console.error('Falha ao enviar cadastro do Passo 1:', error);
    return {
      success: false,
      message: error.message || 'Não foi possível conectar ao servidor.',
    };
  }
}