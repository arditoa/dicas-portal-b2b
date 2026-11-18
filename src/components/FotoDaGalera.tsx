// Rodada 148 — "Foto da galera" na página de uma casa Premium/Fundador (migração 122).
// A pessoa tira a foto; ela vai para Minhas memórias. Se quiser, envia para a casa e/ou autoriza a casa a publicar.
// Cada autorização é separada, com texto claro, e fica registrada (data, hora e versão do texto).
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { salvarMemoria, TEXTO_ENVIAR, TEXTO_PUBLICAR, TEXTO_RODAPE, TEXTO_TODOS } from '../lib/memorias';

function Caixa({ marcado, onTocar, children, desabilitado }: { marcado: boolean; onTocar: () => void; children: React.ReactNode; desabilitado?: boolean }) {
  return (
    <TouchableOpacity style={[s.caixa, desabilitado && { opacity: 0.4 }]} onPress={onTocar} disabled={desabilitado} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked: marcado, disabled: desabilitado }}>
      <View style={[s.check, marcado && s.checkOn]}>{marcado && <Feather name="check" size={13} color="#FFF" />}</View>
      <Text style={s.caixaTxt}>{children}</Text>
    </TouchableOpacity>
  );
}

export default function FotoDaGalera({ localId, nomeCasa }: { localId: string; nomeCasa: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [foto, setFoto] = useState<string | null>(null);
  const [legenda, setLegenda] = useState('');
  const [enviar, setEnviar] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const [todos, setTodos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const tirar = async () => {
    if (!user) return Alert.alert('Entre na sua conta', 'Para guardar fotos em Minhas memórias, entre ou crie sua conta.', [
      { text: 'Agora não', style: 'cancel' }, { text: 'Entrar', onPress: () => router.push('/(tabs)/profile' as any) },
    ]);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Câmera', 'Para tirar a foto, permita o uso da câmera nos Ajustes do celular.');
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 5] });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    setFoto(r.assets[0].uri); setLegenda(''); setEnviar(false); setPublicar(false); setTodos(false);
  };

  const guardar = async () => {
    if (!user || !foto) return;
    if (publicar && !todos) return Alert.alert('Falta confirmar', 'Para a casa publicar, confirme que todas as pessoas da foto concordam.');
    setSalvando(true);
    try {
      await salvarMemoria({ userId: user.id, localId, uri: foto, legenda, enviar, publicar, todos });
      setFoto(null);
      Alert.alert('Guardada!', enviar ? `A foto está em Minhas memórias e foi enviada para ${nomeCasa}.` : 'A foto está em Minhas memórias. Só você vê.');
    } catch (e: any) {
      Alert.alert('Foto', e?.message || 'Não deu para guardar agora.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={s.botao} onPress={() => void tirar()} activeOpacity={0.85} accessibilityRole="button">
        <View style={s.botaoIcone}><Feather name="camera" size={16} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.botaoTit}>Foto da galera</Text>
          <Text style={s.botaoSub}>Guarde em Minhas memórias e, se quiser, envie para a casa</Text>
        </View>
        <Feather name="chevron-right" size={16} color="#8E8BA3" />
      </TouchableOpacity>

      <Modal visible={!!foto} transparent animationType="slide" onRequestClose={() => setFoto(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={s.veu} onPress={() => setFoto(null)}>
            <Pressable style={s.folha} onPress={() => {}}>
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                {!!foto && <Image source={{ uri: foto }} style={s.previa} />}
                <TextInput style={s.legenda} placeholder="Legenda (opcional)" placeholderTextColor="#6E6B80" value={legenda} onChangeText={setLegenda} maxLength={140} />
                <Text style={s.titulo}>Quem pode ver?</Text>
                <Text style={s.sub}>Por padrão, só você. Marque o que quiser liberar:</Text>
                <Caixa marcado={enviar} onTocar={() => { setEnviar(!enviar); if (enviar) { setPublicar(false); setTodos(false); } }}>{TEXTO_ENVIAR(nomeCasa)}</Caixa>
                <Caixa marcado={publicar} desabilitado={!enviar} onTocar={() => { setPublicar(!publicar); if (publicar) setTodos(false); }}>{TEXTO_PUBLICAR(nomeCasa)}</Caixa>
                {publicar && <Caixa marcado={todos} onTocar={() => setTodos(!todos)}>{TEXTO_TODOS}</Caixa>}
                <Text style={s.rodape}>{TEXTO_RODAPE} <Text style={s.link} onPress={() => Linking.openURL('https://www.dicaslgbt.com.br/termos-de-uso')}>Termos de uso</Text></Text>
                <TouchableOpacity style={[s.salvar, salvando && { opacity: 0.6 }]} onPress={() => void guardar()} disabled={salvando} accessibilityRole="button">
                  {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={s.salvarTxt}>{enviar ? 'Guardar e enviar' : 'Guardar em Minhas memórias'}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelar} onPress={() => setFoto(null)} accessibilityRole="button"><Text style={s.cancelarTxt}>Descartar</Text></TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  botao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#161520', borderColor: '#232230', borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12 },
  botaoIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center' },
  botaoTit: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  botaoSub: { color: '#A0A0B2', fontSize: 12, marginTop: 1 },
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '92%', borderColor: '#232230', borderWidth: 1 },
  previa: { width: '100%', aspectRatio: 4 / 5, borderRadius: 14, backgroundColor: '#222', maxHeight: 340, alignSelf: 'center' },
  legenda: { marginTop: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#0F0F14', paddingHorizontal: 12, color: '#FFF', fontSize: 14 },
  titulo: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 16 },
  sub: { color: '#A0A0B2', fontSize: 12, marginTop: 2, marginBottom: 6 },
  caixa: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#0F0F14', marginTop: 8 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#4A4760', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  caixaTxt: { flex: 1, color: '#D6D3E0', fontSize: 13, lineHeight: 18 },
  rodape: { color: '#8E8BA3', fontSize: 11.5, lineHeight: 16, marginTop: 12 },
  link: { color: '#E1306C', fontWeight: '700' },
  salvar: { height: 48, borderRadius: 24, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  salvarTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  cancelar: { alignItems: 'center', paddingVertical: 12 },
  cancelarTxt: { color: '#A0A0B2', fontSize: 13, fontWeight: '700' },
});
