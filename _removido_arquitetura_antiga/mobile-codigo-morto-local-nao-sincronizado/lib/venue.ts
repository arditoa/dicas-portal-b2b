// portal-cadastro/src/lib/venue.ts

const BASE_URL = 'https://dicas-portal-backend.onrender.com/api/partners';

export const TAGS_PUBLICO_VIBE = [
  'Geral / Todos bem-vindos',
  'Gay',
  'Lésbico',
  'Trans & Não-binário',
  'Bissexual+',
  'Drag',
  'Ursos/Leather',
  'Queer/Alternativo',
  'Ballroom/Vogue',
  'Fetiche',
];

export const TAGS_COMODIDADES = [
  'Área externa/rooftop',
  'Ar-condicionado',
  'Estacionamento',
  'Acessibilidade (cadeira de rodas)',
  'Fumódromo',
  'Guarda-volumes',
  'Aceita Pix',
  'Wi-Fi para clientes',
  'Banheiro inclusivo/não-binário',
];

export interface CadastrarVenuePayload {
  bio?: string;
  instagram?: string;
  website?: string;
  tags_publico_vibe: string[];
  tags_comodidades?: string[];
  horario?: string;
  foto_capa: string;
  fotos_galeria?: string[];
}

export async function enviarDetalhesEspaco(
  partnerId: string,
  payload: CadastrarVenuePayload
): Promise<{ success: boolean; message?: string }> {
  try {
    const resposta = await fetch(`${BASE_URL}/${partnerId}/venue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.error || `Erro na API: ${resposta.status}`);
    }

    const dados = await resposta.json();
    return { success: true, message: dados.message };
  } catch (error: any) {
    console.error('Falha ao enviar detalhes do espaço:', error);
    return {
      success: false,
      message: error.message || 'Não foi possível conectar ao servidor.',
    };
  }
}