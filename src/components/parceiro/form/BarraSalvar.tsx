// Barra fixa embaixo com a ação principal (Salvar / Publicar). Trava enquanto salva.
// Para avisar ao sair sem salvar: `useAvisoSairSemSalvar(sujo)` (voltar do Android e gesto de voltar)
// e `confirmarSair(sujo, sair)` para fechar folhas/modais.
import { usePreventRemove, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CP, ESP, RAIO } from '../TelaParceiro';
import { CORES_FORM } from './estilo';

export function confirmarSair(sujo: boolean, sair: () => void) {
  if (!sujo) return sair();
  Alert.alert('Sair sem salvar?', 'O que você mudou aqui ainda não foi salvo.', [
    { text: 'Continuar editando', style: 'cancel' },
    { text: 'Sair sem salvar', style: 'destructive', onPress: sair },
  ]);
}

// Devolve `voltar()`: use no botão "Voltar" da tela. Com mudança não salva, pergunta antes de sair.
// Também trava o gesto de arrastar para voltar (iPhone) e o voltar do Android enquanto houver mudança.
export function useAvisoSairSemSalvar(sujo: boolean) {
  const navigation = useNavigation();
  const router = useRouter();
  // 18/11: ao confirmar a saída, primeiro desligamos a trava e só navegamos no render seguinte.
  // Navegar com a trava ligada fazia o aviso disparar de novo em laço ("Maximum update depth exceeded").
  const [saida, setSaida] = useState<null | { acao?: any }>(null);
  const travar = sujo && !saida;
  const sair = useCallback(() => setSaida({}), []);
  useEffect(() => {
    if (!saida) return;
    if (saida.acao) navigation.dispatch(saida.acao);
    else if (router.canGoBack()) router.back();
    else router.replace('/parceiro');
  }, [saida, navigation, router]);
  // Rede de segurança para qualquer outra saída (gesto, router.replace de outro lugar).
  usePreventRemove(travar, ({ data }) => {
    confirmarSair(true, () => setSaida({ acao: data.action }));
  });
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !travar });
  }, [travar, navigation]);
  useEffect(() => {
    if (!travar) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmarSair(true, sair);
      return true;
    });
    return () => sub.remove();
  }, [travar, sair]);
  return useCallback(() => confirmarSair(travar, sair), [travar, sair]);
}

export function BarraSalvar({ rotulo = 'Salvar', salvando, aoSalvar, desabilitado, secundario, emFolha }: {
  rotulo?: string;
  salvando?: boolean;
  aoSalvar: () => void;
  desabilitado?: boolean;
  secundario?: { rotulo: string; aoTocar: () => void; perigo?: boolean };
  emFolha?: boolean; // dentro de um modal: sem a área segura de baixo duplicada
}) {
  const insets = useSafeAreaInsets();
  const travado = !!salvando || !!desabilitado;
  return (
    <View style={[b.barra, { paddingBottom: emFolha ? ESP.s : Math.max(insets.bottom, ESP.m) }, emFolha && b.emFolha]}>
      {secundario && (
        <TouchableOpacity style={b.sec} onPress={secundario.aoTocar} disabled={!!salvando} accessibilityRole="button">
          <Text style={[b.secTxt, secundario.perigo && { color: CORES_FORM.erro }]}>{secundario.rotulo}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[b.btn, travado && { opacity: 0.6 }]} onPress={aoSalvar} disabled={travado} accessibilityRole="button" accessibilityState={{ disabled: travado, busy: !!salvando }}>
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={b.btnTxt}>{rotulo}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const b = StyleSheet.create({
  barra: { flexDirection: 'row', gap: ESP.s, paddingHorizontal: ESP.l, paddingTop: ESP.m, backgroundColor: CP.bg, borderTopWidth: 1, borderTopColor: CP.borda },
  emFolha: { paddingHorizontal: 0, backgroundColor: 'transparent' },
  btn: { flex: 1, minHeight: 50, borderRadius: RAIO.s, backgroundColor: CP.rosa, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  sec: { minHeight: 50, paddingHorizontal: ESP.l, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda, alignItems: 'center', justifyContent: 'center' },
  secTxt: { color: CP.dim, fontSize: 14, fontWeight: '700' },
});
