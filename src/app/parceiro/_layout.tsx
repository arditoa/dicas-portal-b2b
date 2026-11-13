// Modo parceiro: Stack por cima das abas.
//   (abas)/          → Início · Divulgar · Fidelizar · Aprovações · Meu espaço (rodapé)
//   demais arquivos  → telas cheias empilhadas por cima (agenda, festas, cupons, banner, reservas, equipe, porta…)
// Guarda de entrada: quem não é parceiro volta para o app; senha provisória obriga a trocar antes de tudo.
// As rotas não mudam: /parceiro, /parceiro/divulgar, /parceiro/agenda… (o grupo "(abas)" não aparece no endereço).
import { Redirect, Stack, useSegments } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useModoParceiro } from '../../lib/modoParceiro';

export default function ParceiroLayout() {
  const { carregando, ehParceiro, senhaProvisoria, localAtivo } = useModoParceiro();
  const segmentos = useSegments() as string[];
  const naTrocaDeSenha = segmentos.includes('trocar-senha');
  // Depois que o Modo parceiro aparece, uma recarga em segundo plano não pode desmontar as telas.
  const jaMostrou = useRef(false);

  if (carregando && !(jaMostrou.current && ehParceiro && localAtivo)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0B0E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E1306C" />
      </View>
    );
  }
  if (!ehParceiro || !localAtivo) return <Redirect href="/(tabs)" />;
  if (senhaProvisoria && !naTrocaDeSenha) return <Redirect href="/parceiro/trocar-senha" />;
  jaMostrou.current = true;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0E' }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(abas)" />
    </Stack>
  );
}
