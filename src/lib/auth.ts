import { Alert } from 'react-native';
import { supabase } from './supabase';

export async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuthAction(
  router: any,
  actionDescription: string,
  onAuthenticated: () => void
) {
  const session = await ensureSession();

  if (!session?.user) {
    Alert.alert(
      'Cadastro Necessário 🌈',
      `Para ${actionDescription}, você precisa criar uma conta rápida ou entrar na sua conta.`,
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Criar Conta / Entrar',
          onPress: () => router.push('/register'),
        },
      ]
    );
    return;
  }

  onAuthenticated();
}