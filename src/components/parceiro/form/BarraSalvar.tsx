// Barra fixa embaixo com a ação principal (Salvar / Publicar). Trava enquanto salva.
// Para avisar ao sair sem salvar: `useAvisoSairSemSalvar(sujo)` (voltar do Android e gesto de voltar)
// e `confirmarSair(sujo, sair)` para fechar folhas/modais.
import { usePreventRemove, useNavigation } from 'expo-router';
import { useEffect } from 'react';
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

export function useAvisoSairSemSalvar(sujo: boolean) {
  const navigation = useNavigation();
  usePreventRemove(sujo, ({ data }) => confirmarSair(true, () => navigation.dispatch(data.action)));
  useEffect(() => {
    if (!sujo) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmarSair(true, () => navigation.goBack());
      return true;
    });
    return () => sub.remove();
  }, [sujo, navigation]);
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
