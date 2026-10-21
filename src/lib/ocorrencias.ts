// Registro de ocorrências (migration 045): tipos, rótulos, envio de arquivos
// e texto de resumo para levar ao Boletim de Ocorrência.
import { supabase } from './supabase';

export type CategoriaOcorrencia =
  | 'agressao_fisica'
  | 'ameaca'
  | 'injuria_discriminacao'
  | 'discriminacao_local'
  | 'assedio'
  | 'golpe_extorsao'
  | 'perseguicao_online'
  | 'outro';

export const CATEGORIAS: { v: CategoriaOcorrencia; rotulo: string; dica: string }[] = [
  { v: 'agressao_fisica', rotulo: 'Agressão física', dica: 'Socos, empurrões, qualquer violência física.' },
  { v: 'ameaca', rotulo: 'Ameaça', dica: 'Ameaça presencial, por mensagem ou ligação.' },
  { v: 'injuria_discriminacao', rotulo: 'Ofensa ou discriminação', dica: 'Xingamentos, insultos, tratamento humilhante por ser LGBT+.' },
  { v: 'discriminacao_local', rotulo: 'Discriminação em local ou evento', dica: 'Barrada, expulsa ou mal atendida em bar, festa, hotel, loja.' },
  { v: 'assedio', rotulo: 'Assédio', dica: 'Importunação, toques sem consentimento, insistência.' },
  { v: 'golpe_extorsao', rotulo: 'Golpe ou extorsão', dica: 'Golpe em app de encontro, chantagem, ameaça de expor.' },
  { v: 'perseguicao_online', rotulo: 'Perseguição ou ataque online', dica: 'Perseguição, exposição ou ataques em redes e aplicativos.' },
  { v: 'outro', rotulo: 'Outro', dica: 'Algo que não está nas opções acima.' },
];

export const STATUS_ROTULO: Record<string, string> = {
  recebida: 'Recebida',
  em_analise: 'Em análise',
  aguardando_informacoes: 'Aguardando mais informações',
  encaminhada: 'Encaminhada',
  concluida: 'Concluída',
  arquivada: 'Arquivada',
};

export const STATUS_COR: Record<string, string> = {
  recebida: '#6C8CFF',
  em_analise: '#F5A524',
  aguardando_informacoes: '#E1306C',
  encaminhada: '#9B7BFF',
  concluida: '#3DD68C',
  arquivada: '#8A8AA0',
};

export const LOCAL_TIPOS: { v: 'estabelecimento' | 'via_publica' | 'online' | 'outro'; rotulo: string }[] = [
  { v: 'estabelecimento', rotulo: 'Bar, festa, loja ou hotel' },
  { v: 'via_publica', rotulo: 'Rua ou espaço público' },
  { v: 'online', rotulo: 'Online / aplicativo' },
  { v: 'outro', rotulo: 'Outro' },
];

export const VERSAO_CONSENTIMENTO = '2026-10';

// Canais oficiais (conferidos em fonte pública; o Disque 100 é gratuito e
// funciona todos os dias, 24h, segundo a Agência Gov / MDHC).
export const CANAIS = {
  emergencia: 'tel:190',
  disque100: 'tel:100',
  disque100Whats: 'https://wa.me/5561996110100',
};

export function mascaraData(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "DD/MM/AAAA" -> "AAAA-MM-DD" (ou null se inválida ou no futuro). */
export function dataParaIso(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  if (d.getFullYear() !== Number(aaaa) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) {
    return null;
  }
  if (d.getTime() > Date.now() + 24 * 3600 * 1000) return null;
  if (Number(aaaa) < 2000) return null;
  return `${aaaa}-${mm}-${dd}`;
}

export function dataBr(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function dataHoraBr(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export type OcorrenciaResumo = {
  id: string;
  protocolo: string;
  categoria: CategoriaOcorrencia;
  status: string;
  data_fato: string;
  hora_fato: string | null;
  local_tipo: string;
  local_nome: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  descricao: string;
  envolvidos: string | null;
  testemunhas: string | null;
  bo_situacao: string;
  bo_numero: string | null;
  created_at: string;
};

export function rotuloCategoria(v: string): string {
  return CATEGORIAS.find((c) => c.v === v)?.rotulo ?? v;
}

/** Texto organizado para a pessoa levar/compartilhar ao registrar o B.O. */
export function resumoParaBO(o: OcorrenciaResumo, anexos: number): string {
  const linhas = [
    `Resumo da ocorrência — protocolo ${o.protocolo}`,
    `Registrado no Dicas LGBT+ em ${dataHoraBr(o.created_at)}`,
    '(Este resumo organiza as informações; não é um boletim de ocorrência oficial.)',
    '',
    `Tipo: ${rotuloCategoria(o.categoria)}`,
    `Data do fato: ${dataBr(o.data_fato)}${o.hora_fato ? ` · por volta de ${o.hora_fato}` : ''}`,
    `Local: ${[o.local_nome, o.endereco, [o.cidade, o.uf].filter(Boolean).join('/')].filter(Boolean).join(' — ') || 'não informado'}`,
    '',
    'Relato:',
    o.descricao,
  ];
  if (o.envolvidos) linhas.push('', 'Pessoa(s) envolvida(s):', o.envolvidos);
  if (o.testemunhas) linhas.push('', 'Testemunhas:', o.testemunhas);
  linhas.push('', `Provas anexadas no app: ${anexos}`);
  if (o.bo_situacao === 'sim' && o.bo_numero) linhas.push(`B.O. já registrado: ${o.bo_numero}`);
  return linhas.join('\n');
}

function extensao(mime: string, nome?: string | null): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  if (mime === 'image/heif') return 'heif';
  if (mime === 'video/quicktime') return 'mov';
  if (mime === 'video/mp4') return 'mp4';
  if (mime.startsWith('image/')) return 'jpg';
  const m = nome && /\.([a-z0-9]{2,4})$/i.exec(nome);
  return m ? m[1].toLowerCase() : 'bin';
}

export type ArquivoEscolhido = {
  uri: string;
  tipo: 'imagem' | 'video';
  mime: string;
  tamanho?: number | null;
  nome?: string | null;
};

export const LIMITE_ARQUIVOS = 6;
export const LIMITE_BYTES = 40 * 1024 * 1024;

/** Envia um arquivo para a pasta privada e registra o anexo. */
export async function enviarAnexo(
  userId: string,
  ocorrenciaId: string,
  arq: ArquivoEscolhido
): Promise<void> {
  const resp = await fetch(arq.uri);
  const buf = await resp.arrayBuffer();
  const sufixo = Math.random().toString(36).slice(2, 10);
  const caminho = `${userId}/${ocorrenciaId}/${Date.now()}-${sufixo}.${extensao(arq.mime, arq.nome)}`;

  const up = await supabase.storage.from('ocorrencias').upload(caminho, buf, {
    contentType: arq.mime,
    upsert: false,
  });
  if (up.error) throw up.error;

  const ins = await supabase.from('ocorrencia_anexos').insert({
    ocorrencia_id: ocorrenciaId,
    caminho,
    tipo: arq.tipo,
    mime: arq.mime,
    tamanho_bytes: arq.tamanho ?? buf.byteLength,
  });
  if (ins.error) throw ins.error;
}
