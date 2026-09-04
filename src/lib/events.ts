const BASE_URL = 'https://dicas-portal-backend.onrender.com/api/events';

export const TAGS_MUSICA = [
  'Pop',
  'Funk',
  'Eletrônico',
  'House',
  'Techno',
  'Sertanejo',
  'Reggaeton',
  'Axé',
  'Pagode',
  'MPB',
  'R&B / Hip-Hop',
  'Rock',
  'Indie'
];

export interface FestaPayload {
  partner_id: string;
  nome_evento: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  preco_ingressos?: string;
  link_vendas?: string;
  foto_banner: string;
  tags_musica: string[];
}

export async function criarFesta(payload: FestaPayload): Promise<{ success: boolean; message?: string }> {
  try {
    const resposta = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return { success: false, message: dados.message || 'Erro ao cadastrar evento.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro na API de eventos:', error);
    return { success: false, message: 'Falha na conexão com o servidor.' };
  }
}
