// Notificações push (v1). O usuário liga cada tipo de aviso em Conta >
// Notificações; só então pedimos a permissão do sistema (nada de pedir na
// primeira abertura) e guardamos o aparelho no Supabase (migration 044).
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Rodada 148 — 'marcas': ofertas de marcas parceiras. Opt-in separado (migração 117); nunca ligado pelo "ativar todos".
export type TipoPush = 'festas' | 'cupons' | 'lembretes' | 'novidades' | 'marcas';
export type PrefsPush = Record<TipoPush, boolean>;
export const PREFS_VAZIAS: PrefsPush = { festas: false, cupons: false, lembretes: false, novidades: false, marcas: false };

// Telas que o toque numa notificação pode abrir (mesma regra da função de envio).
// minhas-reservas: aviso da reserva confirmada/recusada (Edge Function avisar-reserva).
const ROTA_OK = /^\/(evento\/[\w-]+|business\/[\w-]+|marca\/[\w-]+|category\/[\w-]+|secao\/[\w-]+|coupons|ingressos|seguranca|termometro|servicos|volta\/[\w-]+|roteiro\/[\w-]+|roteiros|minhas-reservas|parceiro(\/[\w-]+)*|adm(\/[\w-]+)*|\(tabs\)(\/\w+)?)?$/;
export function rotaSegura(rota: unknown): string | null {
  return typeof rota === 'string' && ROTA_OK.test(rota) ? rota : null;
}

/** Como a notificação aparece com o app aberto. Chamar uma vez, no layout raiz. */
export function configurarNotificacoes() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function lerPreferencias(userId: string): Promise<PrefsPush> {
  let { data, error } = await supabase
    .from('push_preferencias')
    .select('festas,cupons,lembretes,novidades,marcas')
    .eq('user_id', userId)
    .maybeSingle();
  // Sem a migração 117 a coluna "marcas" não existe: lê o resto normalmente.
  if (error) ({ data } = await supabase.from('push_preferencias').select('festas,cupons,lembretes,novidades').eq('user_id', userId).maybeSingle());
  return { ...PREFS_VAZIAS, ...((data as Partial<PrefsPush> | null) ?? {}) };
}

export async function salvarPreferencias(userId: string, prefs: PrefsPush): Promise<boolean> {
  const agora = new Date().toISOString();
  const linha: Record<string, unknown> = {
    user_id: userId,
    ...prefs,
    marcas_em: prefs.marcas ? agora : null,
    consentido_em: Object.values(prefs).some(Boolean) ? agora : null,
    atualizado_em: agora,
  };
  let { error } = await supabase.from('push_preferencias').upsert(linha, { onConflict: 'user_id' });
  if (error && /marcas/.test(error.message || '')) {
    // Sem a migração 117: salva só os outros tipos.
    delete linha.marcas;
    delete linha.marcas_em;
    ({ error } = await supabase.from('push_preferencias').upsert(linha, { onConflict: 'user_id' }));
  }
  return !error;
}

export type ResultadoAtivar = 'ok' | 'negado' | 'indisponivel';

/** Pede permissão (se precisar), pega o token do aparelho e registra na conta. */
export async function ativarPushNesteAparelho(): Promise<ResultadoAtivar> {
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return 'negado';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos do Dicas LGBT+',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const { error } = await supabase.rpc('registrar_push_token', {
      p_token: token,
      p_plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    return error ? 'indisponivel' : 'ok';
  } catch {
    // simulador, sem Play Services, sem credencial de push no build, etc.
    return 'indisponivel';
  }
}

/** Um toque: pede a permissão e liga os 4 tipos do app (ação explícita da pessoa = consentimento).
 *  Ofertas de marcas parceiras ficam como estavam: é outra autorização. */
export async function ativarTodosAvisos(userId: string, marcas = false): Promise<ResultadoAtivar> {
  const r = await ativarPushNesteAparelho();
  if (r !== 'ok') return r;
  const ok = await salvarPreferencias(userId, { festas: true, cupons: true, lembretes: true, novidades: true, marcas });
  return ok ? 'ok' : 'indisponivel';
}

/** Para de receber neste aparelho (usado quando todos os tipos ficam desligados). */
export async function desativarPushNesteAparelho(): Promise<void> {
  try {
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await supabase.from('push_dispositivos').update({ ativo: false }).eq('token', token);
  } catch {
    /* sem token neste aparelho: nada a desativar */
  }
}

/** Abre a tela indicada quando a pessoa toca na notificação. */
export function ouvirToqueNaNotificacao(abrir: (rota: string) => void): () => void {
  const tratar = (resp: Notifications.NotificationResponse | null) => {
    const rota = rotaSegura((resp?.notification.request.content.data as any)?.rota);
    if (rota) abrir(rota);
  };
  // app aberto pelo toque (estava fechado)
  Notifications.getLastNotificationResponseAsync().then(tratar).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(tratar);
  return () => sub.remove();
}
