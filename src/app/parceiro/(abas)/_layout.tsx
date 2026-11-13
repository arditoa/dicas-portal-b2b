// Rodada 145 — as 5 abas do Modo parceiro (rodapé). As demais telas (agenda, festas, cupons, banner, porta…)
// ficam no Stack de src/app/parceiro/_layout.tsx, por cima das abas: assim abrir uma tela nunca volta para o Início.
// Ordem: Início · Divulgar · Fidelizar · Aprovações (com o número do que espera resposta) · Meu espaço.
// Abas sem nada para o local/permissão somem (ex.: Fidelizar para marcas de Festas e para o porteiro sem check-ins).
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { itensDaAba } from '../../../lib/parceiroMenu';
import { useModoParceiro } from '../../../lib/modoParceiro';
import { usePendencias } from '../../../lib/pendencias';

export default function AbasDoParceiro() {
  const { carregando, ehParceiro, localAtivo, pode } = useModoParceiro();
  const insets = useSafeAreaInsets();
  const pend = usePendencias(ehParceiro && !carregando ? localAtivo : null, pode);
  if (!localAtivo) return null;

  const tem = (aba: 'operacao' | 'divulgar' | 'fidelizar' | 'espaco') => itensDaAba(aba, localAtivo, pode).length > 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E1306C',
        tabBarInactiveTintColor: '#A0A0B2',
        // Barra mais alta (dedo do dono no balcão): 60 + área segura, ícone e rótulo com respiro.
        tabBarStyle: { backgroundColor: '#0B0B0E', borderTopColor: '#232230', height: 60 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8) },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        sceneStyle: { backgroundColor: '#0B0B0E' },
      }}
    >
      <Tabs.Screen
        name="index"
        // Etapa 6 — aparelho da porta (código + senha) não tem Início: fica em Aprovações (GuardaDoAcesso leva para lá).
        options={{ title: 'Início', href: localAtivo.papel === 'porta_pin' ? null : undefined, tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color as string} /> }}
      />
      <Tabs.Screen
        name="divulgar"
        options={{
          title: 'Divulgar',
          href: tem('divulgar') ? undefined : null,
          tabBarIcon: ({ color }) => <Feather name="send" size={21} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="fidelizar"
        options={{
          title: 'Fidelizar',
          href: tem('fidelizar') ? undefined : null,
          tabBarIcon: ({ color }) => <Feather name="heart" size={21} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="aprovacoes"
        options={{
          title: 'Aprovações',
          href: tem('operacao') ? undefined : null,
          tabBarBadge: pend.total > 0 ? (pend.total > 99 ? '99+' : pend.total) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#E1306C', color: '#FFF', fontSize: 10, fontWeight: '800' },
          tabBarIcon: ({ color }) => <Feather name="check-square" size={21} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="espaco"
        options={{ title: 'Meu espaço', tabBarIcon: ({ color }) => <Feather name="briefcase" size={21} color={color as string} /> }}
      />

    </Tabs>
  );
}
