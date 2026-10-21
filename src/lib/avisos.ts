// "Avise-me" real das categorias Em breve e de campanhas (ex.: Brasil 2027).
// Grava em public.avisos_interesse (migration 035). Exige conta: sem login,
// oferece entrar/criar conta em vez de fingir que registrou (App Store 2.1).
import { Alert } from 'react-native';
import { supabase } from './supabase';

type T = (chave: string, vars?: Record<string, string>) => string;

export async function registrarAviso(params: {
  userId: string | null | undefined;
  alvo: string;
  alvoLabel: string;
  t: T;
  irParaLogin: () => void;
}) {
  const { userId, alvo, alvoLabel, t, irParaLogin } = params;

  if (!userId) {
    Alert.alert(t('aviso.loginTitulo'), t('aviso.loginTexto'), [
      { text: t('aviso.agoraNao'), style: 'cancel' },
      { text: t('aviso.entrar'), onPress: irParaLogin },
    ]);
    return;
  }

  // upsert: tocar de novo no mesmo "avise-me" não gera erro de chave duplicada.
  const { error } = await supabase
    .from('avisos_interesse')
    .upsert({ user_id: userId, alvo }, { onConflict: 'user_id,alvo', ignoreDuplicates: true });

  if (error) {
    Alert.alert('Ops', t('aviso.erro'));
    return;
  }
  Alert.alert(t('aviso.okTitulo'), t('aviso.okTexto', { alvo: alvoLabel }));
}
