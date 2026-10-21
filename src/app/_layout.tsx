import React, { useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/authContext';
import { I18nProvider } from '../lib/i18n';
import { configurarNotificacoes, ouvirToqueNaNotificacao } from '../lib/push';

configurarNotificacoes();

export default function RootLayout() {
  // Espera a fonte dos ícones carregar antes de desenhar as telas. Sem isso,
  // na versão web (link do time) os ícones apareciam como quadradinhos vazios
  // na primeira abertura, até a fonte terminar de baixar.
  const [fontesProntas, erroFontes] = useFonts(Feather.font);
  const router = useRouter();

  // Toque numa notificação push: abre a tela indicada (só rotas permitidas).
  useEffect(() => {
    if (!fontesProntas && !erroFontes) return;
    let parar: (() => void) | undefined;
    const t = setTimeout(() => {
      parar = ouvirToqueNaNotificacao((rota) => router.push(rota as any));
    }, 300);
    return () => {
      clearTimeout(t);
      parar?.();
    };
  }, [fontesProntas, erroFontes, router]);

  if (!fontesProntas && !erroFontes) {
    return <View style={{ flex: 1, backgroundColor: '#0B0B0E' }} />;
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
