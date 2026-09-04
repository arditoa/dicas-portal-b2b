const BASE_URL = 'https://dicas-portal-backend.onrender.com/api/admin';

export interface PartnerPendente {
  id: string;
  nome_responsavel: string;
  cpf_ou_cnpj: string;
  whatsapp_comercial: string;
  created_at: string;
  venue?: {
    bio?: string;
    instagram?: string;
    website?: string;
    foto_capa?: string;
    tags_publico_vibe?: string[];
    tags_comodidades?: string[];
  };
}

export async function listarParceirosPendentes(): Promise<PartnerPendente[]> {
  try {
    const resposta = await fetch(`${BASE_URL}/partners/pending`);
    if (!resposta.ok) throw new Error('Erro ao buscar parceiros pendentes');
    return await resposta.json();
  } catch (error) {
    console.error('Falha ao buscar parceiros:', error);
    return [];
  }
}

export async function aprovarParceiro(partnerId: string): Promise<boolean> {
  try {
    const resposta = await fetch(`${BASE_URL}/partners/${partnerId}/approve`, {
      method: 'POST',
    });
    return resposta.ok;
  } catch (error) {
    console.error('Erro ao aprovar parceiro:', error);
    return false;
  }
}

export async function rejeitarParceiro(partnerId: string, motivo: string): Promise<boolean> {
  try {
    const resposta = await fetch(`${BASE_URL}/partners/${partnerId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    });
    return resposta.ok;
  } catch (error) {
    console.error('Erro ao rejeitar parceiro:', error);
    return false;
  }
}