// Segurança do público LGBT+ (migração 136): contatos de confiança, "Cheguei bem", "Me ajuda aqui",
// selo "Lugar seguro" e Termômetro da noite.
// Emergência: o app só disca (190 / Disque 100). Não existe forma de avisar a polícia sozinho.
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { URL_PORTAL } from './parceiroMenu';
import { supabase } from './supabase';

export const NUMEROS = {
  policia: 'tel:190',
  samu: 'tel:192',
  disque100: 'tel:100',
  disque100Whats: 'https://wa.me/5561996110100',
};

export type Contato = { id: string; nome: string; telefone: string };
export type Volta = { id: string; token: string; previsao: string; status: 'a_caminho' | 'atrasada'; local_id: string | null; local_nome: string | null };
export type CasaAjuda = { id: string; nome: string };
export type PedidoAjuda = { id: string; status: 'aberto' | 'indo' | 'resolvido'; criado_em: string; casa: string };

const msg = (e: any, padrao: string) => {
  const m: string = e?.message || '';
  if (/function .* does not exist|Could not find the function/i.test(m)) return 'Esta função ainda não está ligada. Tente mais tarde.';
  return m || padrao;
};

// ── Localização (só quando a pessoa toca; nunca ao abrir o app) ───────────────────────────────────────────
export async function minhaPosicao(pedir = true): Promise<{ lat: number; lng: number } | null> {
  try {
    const perm = pedir ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 10000)),
    ]);
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}

export const linkMapa = (lat: number, lng: number) => `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;

// ── Contatos de confiança ──────────────────────────────────────────────────────────────────────────────────
export const soDigitos = (t: string) => t.replace(/\D/g, '');
export function normalizarTelefone(t: string): string | null {
  let n = soDigitos(t);
  if (n.startsWith('55') && (n.length === 12 || n.length === 13)) return n;
  if (n.length === 10 || n.length === 11) return n;
  return null;
}
export function telefoneBonito(n: string) {
  const d = n.length > 11 ? n.slice(2) : n;
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}
const comDDI = (n: string) => (n.length === 10 || n.length === 11 ? '55' + n : n);

export async function meusContatos(): Promise<Contato[]> {
  const { data } = await supabase.from('seguranca_contatos').select('id, nome, telefone').order('created_at');
  return (data as Contato[]) || [];
}
export async function adicionarContato(nome: string, telefone: string) {
  const tel = normalizarTelefone(telefone);
  if (!nome.trim()) throw new Error('Escreva o nome.');
  if (!tel) throw new Error('Telefone com DDD, por exemplo (63) 99999-0000.');
  const { error } = await supabase.from('seguranca_contatos').insert({ nome: nome.trim(), telefone: tel });
  if (error) throw new Error(msg(error, 'Não deu para salvar.'));
}
export async function removerContato(id: string) {
  await supabase.from('seguranca_contatos').delete().eq('id', id);
}

// WhatsApp para um contato, com o texto pronto (api.whatsapp.com mantém os emojis)
export function abrirWhats(telefone: string, texto: string) {
  return Linking.openURL(`https://api.whatsapp.com/send?phone=${comDDI(telefone)}&text=${encodeURIComponent(texto)}`);
}
// SMS (para quem não tem WhatsApp ou sem internet boa)
export function abrirSms(telefone: string, texto: string) {
  const sep = Platform.OS === 'ios' ? '&' : '?';
  return Linking.openURL(`sms:+${comDDI(telefone)}${sep}body=${encodeURIComponent(texto)}`);
}

// ── Cheguei bem ────────────────────────────────────────────────────────────────────────────────────────────
export const linkVolta = (token: string) => `${URL_PORTAL}/volta/${token}`;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function textoVolta(token: string, previsao: string, casa?: string | null) {
  return `Oi! Estou voltando${casa ? ` do ${casa}` : ''} e devo chegar até ${hhmm(previsao)}. ` +
    `Se eu não confirmar que cheguei bem, este link avisa: ${linkVolta(token)}`;
}

export async function minhaVoltaAtiva(): Promise<Volta | null> {
  const { data, error } = await supabase.rpc('minha_volta_ativa');
  return error || !data ? null : (data as Volta);
}

const ID_LEMBRETES = ['volta-chegada', 'volta-chegada-2'];
async function agendarLembretes(previsao: string) {
  try {
    await cancelarLembretes();
    const quando = new Date(previsao).getTime();
    const agenda = async (id: string, ms: number, titulo: string, corpo: string) => {
      if (ms <= Date.now() + 5000) return;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title: titulo, body: corpo, sound: 'default', data: { rota: '/seguranca' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(ms) },
      });
    };
    await agenda(ID_LEMBRETES[0], quando, 'Chegou bem? 💚', 'Toque para avisar seus amigos. Precisa de mais tempo? Estenda aqui.');
    await agenda(ID_LEMBRETES[1], quando + 8 * 60000, 'Ainda não confirmou que chegou', 'Em 2 minutos quem te acompanha recebe um alerta.');
  } catch { /* sem permissão de notificação: o alerta do servidor continua valendo */ }
}
async function cancelarLembretes() {
  try { for (const id of ID_LEMBRETES) await Notifications.cancelScheduledNotificationAsync(id); } catch { /* ok */ }
}

export async function iniciarVolta(minutos: number, localId: string | null): Promise<{ token: string; previsao: string }> {
  const pos = await minhaPosicao(true);
  const { data, error } = await supabase.rpc('iniciar_volta', { p_minutos: minutos, p_local: localId, p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null });
  if (error) throw new Error(msg(error, 'Não deu para começar agora.'));
  const v = data as { token: string; previsao: string };
  await agendarLembretes(v.previsao);
  return v;
}
export async function estenderVolta(minutos: number): Promise<string> {
  const { data, error } = await supabase.rpc('estender_volta', { p_minutos: minutos });
  if (error) throw new Error(msg(error, 'Não deu para estender.'));
  const previsao = (data as { previsao: string }).previsao;
  await agendarLembretes(previsao);
  return previsao;
}
export async function chegueiBem() {
  const { error } = await supabase.rpc('cheguei_bem');
  if (error) throw new Error(msg(error, 'Não deu para avisar agora.'));
  await cancelarLembretes();
}
export async function cancelarVolta() {
  await supabase.rpc('cancelar_volta');
  await cancelarLembretes();
}
// Atualiza a última localização quando a pessoa abre o app durante a volta (sem rastrear em segundo plano)
export async function atualizarLocalDaVolta() {
  const pos = await minhaPosicao(false);
  if (pos) await supabase.rpc('atualizar_local_volta', { p_lat: pos.lat, p_lng: pos.lng });
}

// ── Me ajuda aqui ──────────────────────────────────────────────────────────────────────────────────────────
export async function casasParaPedirAjuda(): Promise<CasaAjuda[]> {
  const { data, error } = await supabase.rpc('casas_para_pedir_ajuda');
  return error ? [] : ((data as CasaAjuda[]) || []);
}
export async function pedirAjuda(localId: string, mensagem: string) {
  const { data, error } = await supabase.rpc('pedir_ajuda_na_casa', { p_local: localId, p_mensagem: mensagem || null });
  if (error) throw new Error(msg(error, 'Não deu para avisar a equipe. Se for urgente, ligue 190.'));
  return data as { id: string; repetido: boolean; avisados?: number };
}
export async function meuPedidoDeAjuda(): Promise<PedidoAjuda | null> {
  const { data, error } = await supabase.rpc('meu_pedido_de_ajuda');
  return error || !data ? null : (data as PedidoAjuda);
}

// ── Selo Lugar seguro ──────────────────────────────────────────────────────────────────────────────────────
export type Selo = { respostas: number; tem_selo: boolean; media: number | null; acolhimento: number | null; saida: number | null; equipe: number | null };
export async function seloDaCasa(localId: string): Promise<Selo | null> {
  const { data, error } = await supabase.rpc('selo_lugar_seguro', { p_local: localId });
  return error || !data ? null : (data as Selo);
}
export type AvaliacaoPendente = { local_id: string; visita: string; casa: string };
export async function avaliacaoPendente(): Promise<AvaliacaoPendente | null> {
  const { data, error } = await supabase.rpc('avaliacao_seguranca_pendente');
  return error || !data ? null : (data as AvaliacaoPendente);
}
export async function avaliarSeguranca(p: AvaliacaoPendente, notas: { acolhimento: number; saida: number; equipe: number } | null, comentario = '') {
  const { error } = await supabase.rpc('avaliar_seguranca', {
    p_local: p.local_id, p_visita: p.visita,
    p_acolhimento: notas?.acolhimento ?? null, p_saida: notas?.saida ?? null, p_equipe: notas?.equipe ?? null,
    p_comentario: comentario || null,
  });
  if (error) throw new Error(msg(error, 'Não deu para enviar.'));
}

// ── Termômetro da noite ────────────────────────────────────────────────────────────────────────────────────
export type CasaTermometro = {
  id: string; nome: string; bairro: string | null; cidade: string; lat: number | null; lng: number | null; foto_capa_url: string | null;
  pessoas: number; lotacao: number | null; fila: number | null; clima: number | null; atualizado: string | null;
  evento_id: string | null; festa: string | null; selo: boolean;
};
export async function termometro(cidade?: string | null): Promise<CasaTermometro[]> {
  const { data, error } = await supabase.rpc('termometro_da_noite', { p_cidade: cidade || null });
  if (error) throw new Error(msg(error, 'Não deu para carregar o termômetro.'));
  return (data as CasaTermometro[]) || [];
}
export async function estouAquiAgora(localId: string, sinais: { lotacao?: number; fila?: number; clima?: number } = {}) {
  const pos = await minhaPosicao(true);
  if (!pos) throw new Error('Precisamos da sua localização para confirmar que você está na casa.');
  const { data, error } = await supabase.rpc('estou_aqui_agora', {
    p_local: localId, p_lat: pos.lat, p_lng: pos.lng,
    p_lotacao: sinais.lotacao ?? null, p_fila: sinais.fila ?? null, p_clima: sinais.clima ?? null,
  });
  if (error) throw new Error(msg(error, 'Não deu para registrar agora.'));
  return data as { status: 'ok' } | { status: 'longe'; metros: number };
}

export const ROTULO = {
  lotacao: ['', 'Tranquilo', 'Bom movimento', 'Lotado'],
  fila: ['', 'Sem fila', 'Fila curta', 'Fila grande'],
  clima: ['', 'Morno', 'Animado', 'Bombando'],
};
// Contagem com faixa (não mostra número exato de pessoas pequenas)
export function textoPessoas(n: number) {
  if (n < 3) return 'Começando agora';
  if (n < 10) return 'Algumas pessoas';
  if (n < 30) return `${Math.floor(n / 5) * 5}+ pessoas`;
  return `${Math.floor(n / 10) * 10}+ pessoas`;
}
