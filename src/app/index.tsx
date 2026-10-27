import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CHAVE_ONBOARDING } from './onboarding';

// Primeira abertura do app: mostra a abertura (missão e objetivo). Depois disso, vai direto para a Home.
export default function Index() {
  const [destino, setDestino] = useState<'/onboarding' | '/(tabs)' | null>(null);
  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(CHAVE_ONBOARDING)
      .then((v) => vivo && setDestino(v ? '/(tabs)' : '/onboarding'))
      .catch(() => vivo && setDestino('/(tabs)'));
    return () => { vivo = false; };
  }, []);
  if (!destino) return <View style={{ flex: 1, backgroundColor: '#0B0B0E' }} />;
  return <Redirect href={destino as any} />;
}
