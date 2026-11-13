// Etapa 6 — guarda do acesso com validade (montada uma vez, pelo EntradaModoParceiro).
//   • Vencimento: o aparelho da porta (papel porta_pin) vale até as 6h. Na hora de vencer (ou ao voltar para o app
//     depois disso), recarrega a lista de locais; se era a sessão anônima da porta e não sobrou nada, encerra a sessão.
//     O Stack do Modo parceiro (src/app/parceiro/_layout.tsx) já manda para o app quando a lista fica vazia.
//   • Aparelho da porta só vê Aprovações (com a Porta) e Meu espaço: se cair no Início (src/app/parceiro/(abas)/index),
//     vai para Aprovações. O botão Início some em (abas)/_layout.tsx; Divulgar e Fidelizar somem pelo parceiroMenu.
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../lib/authContext';
import { useModoParceiro } from '../lib/modoParceiro';
import { supabase } from '../lib/supabase';

export default function GuardaDoAcesso() {
  const router = useRouter();
  const segmentos = useSegments() as string[];
  const { user } = useAuth();
  const { locais, localAtivo, recarregar } = useModoParceiro();

  // vencimento
  useEffect(() => {
    const vencimentos = locais.map((l) => (l.expira_em ? new Date(l.expira_em).getTime() : null)).filter((x): x is number => x !== null);
    if (!vencimentos.length) return;
    const primeiro = Math.min(...vencimentos);
    const vencer = async () => {
      const agora = Date.now();
      const todosVencidos = locais.every((l) => !!l.expira_em && new Date(l.expira_em).getTime() <= agora);
      if (user?.is_anonymous && todosVencidos) {
        await supabase.auth.signOut();
        return;
      }
      await recarregar();
    };
    const t = setTimeout(() => void vencer(), Math.min(Math.max(1000, primeiro - Date.now() + 1000), 2 ** 31 - 1));
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && primeiro <= Date.now()) void vencer();
    });
    return () => { clearTimeout(t); sub.remove(); };
  }, [locais, user?.is_anonymous, recarregar]);

  // aparelho da porta: Início → Aprovações
  const ultimo = segmentos[segmentos.length - 1];
  const noInicio = segmentos[0] === 'parceiro' && (segmentos.length === 1 || ultimo === '(abas)' || ultimo === 'index');
  useEffect(() => {
    if (localAtivo?.papel === 'porta_pin' && noInicio) router.replace('/parceiro/aprovacoes');
  }, [localAtivo?.papel, noInicio, router]);

  return null;
}
