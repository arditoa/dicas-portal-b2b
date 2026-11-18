// Modo equipe (app admin): só para quem é da equipe Dicas (profiles.role = 'admin', função is_admin()).
//   (abas)/     → Início · Vitrine · Banners · Aprovar · Locais (rodapé)
//   demais      → banner-editar, local/[id] (por cima das abas)
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useEhAdmin } from '../../lib/admin';
import { useAuth } from '../../lib/authContext';

export default function AdmLayout() {
  const { user } = useAuth();
  const eh = useEhAdmin(user?.id);
  if (eh === null) {
    return <View style={{ flex: 1, backgroundColor: '#0B0B0E', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#E1306C" /></View>;
  }
  if (!eh) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0E' }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(abas)" />
    </Stack>
  );
}
