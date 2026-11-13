// Rodada 145 — quem é parceiro já entra no Modo parceiro (uma vez por abertura do app e a cada login).
// Se a pessoa escolheu "Ver como cliente", o app lembra e não redireciona; ela volta pelo cartão na aba Conta.
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/authContext';
import { useModoParceiro } from '../lib/modoParceiro';
import GuardaDoAcesso from './GuardaDoAcesso';

export default function EntradaModoParceiro() {
  const router = useRouter();
  const segmentos = useSegments() as string[];
  const { user } = useAuth();
  const { carregando, ehParceiro, modo } = useModoParceiro();
  const jaLevouParaUsuario = useRef<string | null>(null);

  useEffect(() => {
    if (carregando || !user) return;
    if (jaLevouParaUsuario.current === user.id) return;
    jaLevouParaUsuario.current = user.id;
    if (ehParceiro && modo === 'parceiro' && segmentos[0] !== 'parceiro') {
      router.replace('/parceiro');
    }
  }, [carregando, user, ehParceiro, modo, segmentos, router]);

  useEffect(() => {
    if (!user) jaLevouParaUsuario.current = null;
  }, [user]);

  // Etapa 6 — vencimento do acesso da porta e porteiro só em Aprovações.
  return <GuardaDoAcesso />;
}
