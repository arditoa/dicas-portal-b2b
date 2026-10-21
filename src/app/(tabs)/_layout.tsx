import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useI18n } from '../../lib/i18n';

// Nova versão (Home estilo Uber): Início · Mapa · Eventos · Trip · Conta.
// A caixa de entrada não tem aba própria — fica dentro de Conta (e tem
// atalho no topo da Home).
export default function TabLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E1306C',
        tabBarInactiveTintColor: '#A0A0B2',
        tabBarStyle: {
          backgroundColor: '#0B0B0E',
          borderTopColor: '#232230',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.inicio'),
          tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tab.mapa'),
          tabBarIcon: ({ color }) => <Feather name="map" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('tab.eventos'),
          tabBarIcon: ({ color }) => <Feather name="calendar" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tourism"
        options={{
          title: t('tab.trip'),
          tabBarIcon: ({ color }) => <Feather name="briefcase" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.conta'),
          tabBarIcon: ({ color }) => <Feather name="user" size={21} color={color} />,
        }}
      />

      {/* Rota auxiliar fora da barra inferior */}
      <Tabs.Screen name="categories" options={{ href: null }} />
    </Tabs>
  );
}
