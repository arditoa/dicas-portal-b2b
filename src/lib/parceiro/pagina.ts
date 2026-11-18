// Minha página do Modo parceiro (só o dono). REGRAS COPIADAS de portal-b2b-lgbt/src/app/dashboard/perfil/page.tsx,
// de lib/horarios.ts (formato de locais.horario_funcionamento) e de lib/parceiro.ts (perfil incompleto).
//   - nome obrigatório; descrição até 800 (o lembrete pede 20 ou mais);
//   - capa e logo (sem logo, o app usa a capa); galeria até 6 fotos; vídeo só por link (Instagram/Reels/YouTube);
//     galeria e vídeo só aparecem no app para Premium/Fundador ativo (o aviso não trava o preenchimento);
//   - relação com a comunidade LGBT+ (uma; tocar de novo desmarca); público: nenhum marcado = ['todos'];
//   - horário por dia (aberto, abre, fecha, música ao vivo); dia fechado não guarda horário;
//   - Instagram (@usuário), WhatsApp (aviso sem DDD), e-mail e nome do contato;
//   - serviços: tipo de atendimento + especialidade; produtos: link da loja online (os outros gravam null);
//   - cidade obrigatória, exceto serviços, turismo e produtos; "bairro para exibir" só muda o texto;
//   - coordenadas: pelo endereço ou pela localização atual (sem elas "Ver no mapa" não funciona).
//   Status, selo e destaque são do admin (gatilho protect_admin_fields_locais): aqui só aparecem.
// Diferença de propósito: categoria e subcategoria só aparecem (mudar = falar com a equipe), para não tirar a casa
// da vitrine por engano. Fotos: até 8 MB (limite do bucket); o portal pede até 5 MB.
import * as Location from 'expo-location';
import { recursosDaCategoria } from '../modoParceiro';
import { supabase } from '../supabase';

export const DIAS_SEMANA = [
  { chave: 'segunda', label: 'Segunda' }, { chave: 'terca', label: 'Terça' }, { chave: 'quarta', label: 'Quarta' },
  { chave: 'quinta', label: 'Quinta' }, { chave: 'sexta', label: 'Sexta' }, { chave: 'sabado', label: 'Sábado' },
  { chave: 'domingo', label: 'Domingo' },
] as const;
export type HorarioDia = { aberto: boolean; abre?: string; fecha?: string; musica_ao_vivo?: string };
export type Horario = Record<string, HorarioDia>;
export function normalizarHorario(h: Horario | null | undefined): Horario {
  const base: Horario = {};
  DIAS_SEMANA.forEach((d) => { base[d.chave] = h?.[d.chave] ? { ...h[d.chave] } : { aberto: false }; });
  return base;
}
export function limparHorario(h: Horario): Horario {
  const limpo: Horario = {};
  DIAS_SEMANA.forEach((d) => {
    const dia = h[d.chave];
    limpo[d.chave] = !dia || !dia.aberto
      ? { aberto: false }
      : { aberto: true, ...(dia.abre ? { abre: dia.abre } : {}), ...(dia.fecha ? { fecha: dia.fecha } : {}), ...(dia.musica_ao_vivo ? { musica_ao_vivo: dia.musica_ao_vivo } : {}) };
  });
  return limpo;
}

export const PUBLICO_OPCOES = [
  { slug: 'lesbica', label: 'Mulheres lésbicas' }, { slug: 'gay', label: 'Homens gays' }, { slug: 'bi', label: 'Bissexuais' },
  { slug: 'trans', label: 'Trans e travestis' }, { slug: 'nao_binario', label: 'Não binário' }, { slug: 'queer', label: 'Queer' },
  { slug: 'ursos', label: 'Ursos' }, { slug: 'daddy', label: 'Daddy' }, { slug: 'leather', label: 'Leather' },
  { slug: 'drag', label: 'Drag' }, { slug: 'misto_lgbt', label: 'Misto LGBT+' }, { slug: 'aliados', label: 'Aliados' },
];
export const ATENDIMENTO = [{ valor: 'presencial', rotulo: 'Presencial' }, { valor: 'online', rotulo: 'Online' }, { valor: 'ambos', rotulo: 'Presencial e online' }];
export const LIMITE_GALERIA = 6;
export const MAX_DESCRICAO = 800;

export type Pagina = {
  id: string; nome: string; categoria: string; subcategoria: string | null; descricao: string; bairro: string; bairro_exibicao: string;
  cidade: string; endereco: string; atendimento_tipo: string | null; especialidade: string; link_loja_online: string;
  instagram: string; contato_nome: string; contato_email: string; contato_telefone: string;
  foto_capa_url: string | null; logo_url: string | null; lat: number | null; lng: number | null;
  publico_tags: string[]; classificacao_lgbt: string | null; horario_funcionamento: Horario; galeria_fotos: string[]; video_url: string;
  status: string; plano_destaque: string | null; plano_comercial: string | null; plano_comercial_status: string | null;
  acolhimento?: string[]; // 142 — ausente se a migração ainda não rodou
};
const CAMPOS = 'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, endereco, atendimento_tipo, especialidade, link_loja_online, lat, lng, instagram, contato_nome, contato_email, contato_telefone, foto_capa_url, logo_url, publico_tags, classificacao_lgbt, plano_comercial, plano_comercial_status, status, plano_destaque, horario_funcionamento, galeria_fotos, video_url';

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied')) return 'Só o dono do local mexe na página.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  return e?.message || 'Algo deu errado. Tente de novo.';
}

export async function obterPagina(localId: string): Promise<Pagina> {
  // 142: tenta com acolhimento; se a coluna ainda não existir, carrega sem ela
  let { data, error } = await supabase.from('locais').select(CAMPOS + ', acolhimento').eq('id', localId).maybeSingle();
  if (error) ({ data, error } = await supabase.from('locais').select(CAMPOS).eq('id', localId).maybeSingle());
  if (error || !data) throw new Error(traduzirErro(error) || 'Página não encontrada.');
  const d = data as any;
  const txt = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    ...d,
    descricao: txt(d.descricao), bairro: txt(d.bairro), bairro_exibicao: txt(d.bairro_exibicao), cidade: txt(d.cidade), endereco: txt(d.endereco),
    especialidade: txt(d.especialidade), link_loja_online: txt(d.link_loja_online), instagram: txt(d.instagram), contato_nome: txt(d.contato_nome),
    contato_email: txt(d.contato_email), contato_telefone: txt(d.contato_telefone), video_url: txt(d.video_url),
    publico_tags: d.publico_tags || ['todos'], galeria_fotos: d.galeria_fotos || [], horario_funcionamento: normalizarHorario(d.horario_funcionamento),
  } as Pagina;
}

export type Secao = 'fotos' | 'sobre' | 'horarios' | 'contato' | 'endereco';

// Campos que cada seção grava (as outras seções não são tocadas).
export function camposDaSecao(secao: Secao, p: Pagina): Record<string, unknown> {
  const t = (v: string) => v.trim() || null;
  switch (secao) {
    case 'fotos': return { foto_capa_url: p.foto_capa_url, logo_url: p.logo_url, galeria_fotos: p.galeria_fotos.slice(0, LIMITE_GALERIA), video_url: t(p.video_url) };
    case 'sobre': return { nome: p.nome.trim(), descricao: t(p.descricao), classificacao_lgbt: p.classificacao_lgbt || null, publico_tags: p.publico_tags.length ? p.publico_tags : ['todos'],
      ...(p.acolhimento ? { acolhimento: p.acolhimento } : {}) };
    case 'horarios': return { horario_funcionamento: limparHorario(p.horario_funcionamento) };
    case 'contato': return {
      instagram: t(p.instagram.replace(/^@/, '')), contato_nome: t(p.contato_nome), contato_email: t(p.contato_email), contato_telefone: t(p.contato_telefone),
      atendimento_tipo: p.categoria === 'servicos' ? p.atendimento_tipo || null : null,
      especialidade: p.categoria === 'servicos' ? t(p.especialidade) : null,
      link_loja_online: p.categoria === 'produtos' ? t(p.link_loja_online) : null,
    };
    case 'endereco': return { endereco: t(p.endereco), bairro: t(p.bairro), bairro_exibicao: t(p.bairro_exibicao), cidade: p.cidade.trim(), lat: p.lat, lng: p.lng };
  }
}

export const cidadeOpcional = (categoria: string) => ['servicos', 'turismo', 'produtos'].includes(categoria);
export const telefoneCurto = (tel: string) => { const d = tel.replace(/\D/g, ''); return d.length > 0 && d.length < 10; };

export function validarSecao(secao: Secao, p: Pagina): string | null {
  if (secao === 'sobre' && !p.nome.trim()) return 'O nome da casa é obrigatório.';
  if (secao === 'sobre' && p.descricao.length > MAX_DESCRICAO) return `A descrição pode ter até ${MAX_DESCRICAO} letras.`;
  if (secao === 'endereco' && !cidadeOpcional(p.categoria) && !p.cidade.trim()) return 'A cidade é obrigatória.';
  if (secao === 'fotos' && p.video_url.trim() && !/^https?:\/\//i.test(p.video_url.trim())) return 'O vídeo é um link que começa com https:// (Instagram, Reels ou YouTube).';
  if (secao === 'contato' && p.link_loja_online.trim() && !/^https?:\/\//i.test(p.link_loja_online.trim())) return 'O link da loja começa com https://';
  if (secao === 'contato' && p.contato_email.trim() && !/^\S+@\S+\.\S+$/.test(p.contato_email.trim())) return 'Confira o e-mail.';
  return null;
}

export async function salvarSecao(secao: Secao, p: Pagina): Promise<void> {
  const erro = validarSecao(secao, p);
  if (erro) throw new Error(erro);
  const { error } = await supabase.from('locais').update(camposDaSecao(secao, p)).eq('id', p.id);
  if (error) throw new Error(traduzirErro(error));
}

// O que falta na página (mesma regra do lembrete "Complete a página" do portal).
export function oQueFalta(p: Pick<Pagina, 'categoria' | 'subcategoria' | 'foto_capa_url' | 'logo_url' | 'galeria_fotos' | 'descricao' | 'instagram' | 'horario_funcionamento'>): { secao: Secao; txt: string }[] {
  const r = recursosDaCategoria(p.categoria, p.subcategoria);
  if (!r.pedePagina) return [];
  const falta: { secao: Secao; txt: string }[] = [];
  if (!p.foto_capa_url && !p.logo_url && !(p.galeria_fotos?.length)) falta.push({ secao: 'fotos', txt: 'foto' });
  if ((p.descricao || '').trim().length < 20) falta.push({ secao: 'sobre', txt: 'descrição' });
  if (!(p.instagram || '').trim()) falta.push({ secao: 'contato', txt: 'Instagram' });
  if (r.pedeHorario && !Object.values(p.horario_funcionamento || {}).some((d) => d?.aberto)) falta.push({ secao: 'horarios', txt: 'horário de funcionamento' });
  return falta;
}

export const premiumAtivo = (p: Pick<Pagina, 'plano_comercial' | 'plano_comercial_status'>) =>
  (p.plano_comercial_status ?? 'ativo') === 'ativo' && (p.plano_comercial === 'premium' || p.plano_comercial === 'fundador');

// Coordenadas: pelo endereço (geocodificação do aparelho) ou pela localização atual.
export async function coordenadasDoEndereco(p: Pick<Pagina, 'endereco' | 'bairro' | 'cidade'>): Promise<{ lat: number; lng: number } | null> {
  const consulta = [p.endereco, p.bairro, p.cidade, 'Brasil'].map((x) => (x || '').trim()).filter(Boolean).join(', ');
  if (!consulta.replace(/, Brasil$/, '').trim()) throw new Error('Preencha ao menos a cidade antes de buscar a localização.');
  try {
    const r = await Location.geocodeAsync(consulta);
    return r[0] ? { lat: r[0].latitude, lng: r[0].longitude } : null;
  } catch {
    return null;
  }
}
export async function coordenadasAqui(): Promise<{ lat: number; lng: number }> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error('Libere a localização nos Ajustes do celular para usar onde você está agora.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
