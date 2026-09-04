const BASE_URL = 'https://dicas-portal-backend.onrender.com/api/coupons';

export interface CupomPayload {
  partner_id: string;
  codigo_cupom: string;
  titulo_oferta: string;
  descricao_regras?: string;
  desconto_porcentagem?: number;
  desconto_valor_fixo?: number;
  data_validade: string;
}

export async function criarCupom(payload: CupomPayload): Promise<{ success: boolean; message?: string }> {
  try {
    const resposta = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return { success: false, message: dados.message || 'Erro ao cadastrar cupom.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro na API de cupons:', error);
    return { success: false, message: 'Falha na conexão com o servidor.' };
  }
}
