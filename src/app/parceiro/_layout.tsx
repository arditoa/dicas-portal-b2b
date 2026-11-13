// Rodada 145 — Modo parceiro com abas no rodapé: Início · Divulgar · Fidelizar · Meu espaço.
// Guarda de entrada: quem não é parceiro volta para o app; senha provisória obriga a trocar antes de tudo.
// Ordem: Início · Divulgar · Fidelizar · Aprovações (com o número do que espera resposta) · Meu espaço.
// Abas sem nada para o local/permissão somem (ex.: Fidelizar para marcas de Festas e para o porteiro sem check-ins).
// Porta e troca de senha são telas cheias, sem a barra de abas.
import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { itensDaAba } from '../../lib/parceiroMenu';
import { useModoParceiro } from '../../lib/modoParceiro';
import { usePendencias } from '../../lib/pendencias';

export default function ParceiroLayout() {
  const { carregando, ehParceiro, senhaProvisoria, localAtivo, pode } = useModoParceiro();
  const segmentos = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const pend = usePendencias(ehParceiro && !carregando ? localAtivo : null, pode);
  const naTrocaDeSenha = segmentos.includes('trocar-senha');

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0B0E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E1306C" />
      </View>
    );
  }
  if (!ehParceiro || !localAtivo) return <Redirect href="/(tabs)" />;
  if (senhaProvisoria && !naTrocaDeSenha) return <Redirect href="/parceiro/trocar-senha" />;

  const tem = (aba: 'operacao' | 'divulgar' | 'fidelizar' | 'espaco') => itensDaAba(aba, localAtivo, pode).length > 0;
  const semBarra = { tabBarStyle: { display: 'none' as const } };

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
        options={{ title: 'Início', tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color as string} /> }}
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

      {/* Telas cheias, fora da barra */}
      <Tabs.Screen name="porta" options={{ href: null, ...semBarra }} />
      <Tabs.Screen name="trocar-senha" options={{ href: null, ...semBarra }} />
      <Tabs.Screen name="clientes" options={{ href: null }} />
      <Tabs.Screen name="reservas" options={{ href: null }} />
      <Tabs.Screen name="agenda" options={{ href: null }} />
    </Tabs>
  );
}
