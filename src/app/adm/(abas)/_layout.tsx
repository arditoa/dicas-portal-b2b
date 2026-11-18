// Rodapé do Modo equipe: Início (caixa de entrada do dia) · Aprovar · Vitrine (tudo por lugar: Home, Trip, categorias) · Locais.
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';

export default function AbasAdm() {
  const insets = useSafeAreaInsets();
  const [pend, setPend] = useState(0);
  useFocusEffect(useCallback(() => {
    supabase.rpc('admin_resumo').then(({ data }) => {
      const p = (data as any)?.pendencias;
      if (p) setPend((p.casas || 0) + (p.festas || 0) + (p.acoes_marca || 0));
    }, () => {});
  }, []));
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: '#E1306C', tabBarInactiveTintColor: '#A0A0B2',
      tabBarStyle: { backgroundColor: '#0B0B0E', borderTopColor: '#232230', height: 60 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8) },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 }, sceneStyle: { backgroundColor: '#0B0B0E' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color as string} /> }} />
      <Tabs.Screen name="aprovar" options={{
        title: 'Aprovar', tabBarBadge: pend > 0 ? (pend > 99 ? '99+' : pend) : undefined,
        tabBarBadgeStyle: { backgroundColor: '#E1306C', color: '#FFF', fontSize: 10, fontWeight: '800' },
        tabBarIcon: ({ color }) => <Feather name="check-square" size={21} color={color as string} />,
      }} />
      <Tabs.Screen name="banners" options={{ href: null }} />
      <Tabs.Screen name="locais" options={{ title: 'Locais', tabBarIcon: ({ color }) => <Feather name="map-pin" size={21} color={color as string} /> }} />
      <Tabs.Screen name="vitrine" options={{ title: 'Vitrine', tabBarIcon: ({ color }) => <Feather name="layout" size={21} color={color as string} /> }} />
    </Tabs>
  );
}
