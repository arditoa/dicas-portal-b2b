// Foto do Modo parceiro: escolhe da galeria ou tira com a câmera, recorta (proporção opcional),
// comprime (qualidade 0.7), sobe no bucket e devolve a URL pública em `aoMudar`.
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bucket, enviarFoto } from '../../../lib/parceiro/fotos';
import { CP, ESP, RAIO } from '../TelaParceiro';
import { CORES_FORM, f } from './estilo';

export function FotoUpload({ rotulo, valor, aoMudar, bucket, pasta, prefixo = 'foto', aspecto, ajuda, altura = 160, encaixe = 'cover', enviarDepois }: {
  rotulo: string;
  valor: string | null;
  aoMudar: (url: string | null) => void;
  bucket: Bucket;
  pasta: string; // id do local (a regra do Storage libera "<local_id>/...")
  prefixo?: string;
  aspecto?: [number, number]; // ex.: [4, 5] para cartaz; sem aspecto = recorte livre
  ajuda?: string;
  altura?: number;
  encaixe?: 'cover' | 'contain';
  // true = não sobe agora: devolve o endereço da foto no aparelho (file://...) e quem usa sobe depois
  // com enviarFoto (ex.: festa nova, que só pode receber arquivo depois de existir no banco).
  enviarDepois?: boolean;
}) {
  const [enviando, setEnviando] = useState(false);

  const pegar = async (origem: 'galeria' | 'camera') => {
    try {
      const perm = origem === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        return Alert.alert('Permissão', origem === 'camera' ? 'Libere a câmera nos Ajustes do celular para tirar a foto.' : 'Libere o acesso às fotos nos Ajustes do celular.');
      }
      const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: aspecto, quality: 0.7 };
      const r = origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
      if (r.canceled || !r.assets?.[0]) return;
      if (enviarDepois) return aoMudar(r.assets[0].uri);
      setEnviando(true);
      const url = await enviarFoto(bucket, pasta, prefixo, r.assets[0].uri, r.assets[0].mimeType);
      aoMudar(url);
    } catch (e: any) {
      Alert.alert('Foto', e?.message || 'Não foi possível enviar a foto.');
    } finally {
      setEnviando(false);
    }
  };

  const escolher = () =>
    Alert.alert(rotulo, undefined, [
      { text: 'Escolher da galeria', onPress: () => void pegar('galeria') },
      { text: 'Tirar foto', onPress: () => void pegar('camera') },
      ...(valor ? [{ text: 'Remover foto', style: 'destructive' as const, onPress: () => aoMudar(null) }] : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);

  return (
    <View style={f.bloco}>
      <Text style={f.rotulo}>{rotulo}</Text>
      <TouchableOpacity style={[u.caixa, { height: valor ? altura : 72 }]} onPress={escolher} disabled={enviando} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={valor ? `${rotulo}. Toque para trocar` : `${rotulo}. Toque para enviar`}>
        {valor ? (
          <>
            <Image source={{ uri: valor }} style={StyleSheet.absoluteFill} resizeMode={encaixe} />
            <View style={u.trocar}><Feather name="refresh-cw" size={12} color="#FFF" /><Text style={u.trocarTxt}>Trocar</Text></View>
          </>
        ) : (
          <View style={u.vazio}>
            <Feather name="upload" size={16} color={CP.dim} />
            <Text style={u.vazioTxt}>Enviar foto</Text>
          </View>
        )}
        {enviando && <View style={u.carregando}><ActivityIndicator color="#FFF" /><Text style={u.trocarTxt}>Enviando…</Text></View>}
      </TouchableOpacity>
      {!!ajuda && <Text style={[f.ajuda, { marginTop: 4 }]}>{ajuda}</Text>}
    </View>
  );
}

const u = StyleSheet.create({
  caixa: { borderRadius: RAIO.s, borderWidth: 1, borderStyle: 'dashed', borderColor: CP.borda, backgroundColor: CORES_FORM.campo, overflow: 'hidden', justifyContent: 'center' },
  vazio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESP.s },
  vazioTxt: { color: CP.dim, fontSize: 13, fontWeight: '700' },
  trocar: { position: 'absolute', right: ESP.s, bottom: ESP.s, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  trocarTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  carregando: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
