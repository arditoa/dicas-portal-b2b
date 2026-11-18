// Rodada 148 — foto com a moldura da marca (ação de marca, migração 121).
// A pessoa tira a foto no próprio app; a moldura (cor da marca, "Apoio · <marca>", nome da ação e data) é
// desenhada por cima e a imagem final é gerada no celular. Nada sobe para o servidor: a pessoa escolhe
// compartilhar (Stories, WhatsApp…) ou salvar no celular. O app só conta quantas fotos e compartilhamentos houve.
// Migração 127 — opcional: enviar para a marca (privado) e deixar a marca postar, com autorizações separadas e
// registradas. A foto enviada fica em Minhas memórias, onde a pessoa retira quando quiser.
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useAuth } from '../lib/authContext';
import { enviarFotoParaMarca, TEXTO_ENVIAR_MARCA, TEXTO_PUBLICAR_MARCA } from '../lib/memorias';
import { supabase } from '../lib/supabase';

type Props = { acaoId: string; marca: string; nome: string; cor: string; logoUrl?: string | null; textoBotao?: string; molduraUrl?: string | null; molduraTexto?: string | null; estiloBotao?: object };

const registrar = (acaoId: string, tipo: 'foto' | 'compartilhou' | 'salvou') => {
  supabase.rpc('registrar_foto_marca', { p_acao: acaoId, p_tipo: tipo }).then(() => {}, () => {});
};

export default function FotoComMoldura({ acaoId, marca, nome, cor, logoUrl, textoBotao = 'Tirar foto com a moldura', molduraUrl, molduraTexto, estiloBotao }: Props) {
  // Rodada 148 — antes de compartilhar, a pessoa confirma que todos na foto concordam (nos protege e protege a galera).
  const [todosOk, setTodosOk] = useState(false);
  const { user } = useAuth();
  const [paraMarca, setParaMarca] = useState(false);
  const [marcaPosta, setMarcaPosta] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { height } = useWindowDimensions();
  const { width } = useWindowDimensions();
  const [foto, setFoto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ref = useRef<{ capture?: () => Promise<string> } | null>(null);
  const largura = Math.min(width - 40, 380);
  const altura = Math.round((largura * 5) / 4);
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const tirar = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert('Câmera', 'Para tirar a foto com a moldura, permita o uso da câmera nos Ajustes do celular.');
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 5] });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    setFoto(r.assets[0].uri);
    setTodosOk(false);
    setParaMarca(false);
    setMarcaPosta(false);
    setEnviada(false);
    registrar(acaoId, 'foto');
  };

  const gerar = async (): Promise<string | null> => {
    try {
      return (await ref.current?.capture?.()) ?? null;
    } catch {
      Alert.alert('Foto', 'Não deu para montar a foto agora. Tente de novo.');
      return null;
    }
  };

  const compartilhar = async () => {
    if (!todosOk) return Alert.alert('Antes de compartilhar', 'Confirme que todas as pessoas que aparecem na foto concordam em compartilhar.');
    setOcupado(true);
    const uri = await gerar();
    setOcupado(false);
    if (!uri) return;
    if (!(await Sharing.isAvailableAsync())) return Alert.alert('Compartilhar', 'Este celular não permite compartilhar daqui. Salve a foto e poste pela galeria.');
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: `Foto com ${marca}` });
    registrar(acaoId, 'compartilhou');
  };

  const enviarMarca = async () => {
    if (!user) return;
    if (!todosOk) return Alert.alert('Antes de enviar', 'Confirme que todas as pessoas que aparecem na foto têm 18 anos ou mais e concordam.');
    setEnviando(true);
    try {
      const uri = await gerar();
      if (!uri) return;
      await enviarFotoParaMarca({ userId: user.id, acaoId, marca, uri, publicar: marcaPosta });
      setEnviada(true);
    } catch (e: any) {
      Alert.alert('Enviar para a marca', e?.message || 'Não deu para enviar agora.');
    } finally {
      setEnviando(false);
    }
  };

  const salvar = async () => {
    setOcupado(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) return Alert.alert('Salvar', 'Para salvar, permita o acesso às fotos nos Ajustes do celular.');
      const uri = await gerar();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      registrar(acaoId, 'salvou');
      Alert.alert('Pronto!', 'A foto foi salva no seu celular.');
    } catch {
      Alert.alert('Salvar', 'Não deu para salvar agora.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={[s.botao, { borderColor: cor }, estiloBotao]} onPress={() => void tirar()} activeOpacity={0.85} accessibilityRole="button">
        <Feather name="camera" size={16} color={cor} />
        <Text style={[s.botaoTxt, { color: cor }]}>{textoBotao}</Text>
      </TouchableOpacity>

      <Modal visible={!!foto} transparent animationType="slide" onRequestClose={() => setFoto(null)}>
        <Pressable style={s.veu} onPress={() => setFoto(null)}>
          <Pressable style={[s.folha, { maxHeight: height * 0.92 }]} onPress={() => {}}>
            <ScrollView contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
            <ViewShot ref={ref as any} options={{ format: 'jpg', quality: 0.92, width: 1080, height: 1350 }} style={{ width: largura, height: altura, borderRadius: 4, overflow: 'hidden' }}>
              <View style={[s.moldura, { width: largura, height: altura, backgroundColor: cor }]}>
                {!!foto && !molduraUrl && <Image source={{ uri: foto }} style={[s.foto, { width: largura - 20, height: altura - 108 }]} />}
                {/* Moldura da própria marca (PNG transparente por cima da foto inteira) */}
                {!!foto && !!molduraUrl && (
                  <>
                    <Image source={{ uri: foto }} style={{ position: 'absolute', top: 0, left: 0, width: largura, height: altura }} />
                    <Image source={{ uri: molduraUrl }} style={{ position: 'absolute', top: 0, left: 0, width: largura, height: altura }} resizeMode="stretch" />
                  </>
                )}
                {!molduraUrl && (
                <>
                <View style={s.topo}>
                  <View style={s.pilula}>
                    {logoUrl ? <Image source={{ uri: logoUrl }} style={s.logo} resizeMode="contain" /> : <Feather name="award" size={12} color="#111" />}
                    <Text style={s.pilulaTxt}>Apoio · {marca}</Text>
                  </View>
                </View>
                <View style={s.rodape}>
                  <Text style={s.nome} numberOfLines={1}>{molduraTexto || nome}</Text>
                  <Text style={s.assinatura}>Dicas LGBT+ · {hoje}</Text>
                </View>
                </>
                )}
              </View>
            </ViewShot>

            <TouchableOpacity style={s.consent} onPress={() => setTodosOk(!todosOk)} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked: todosOk }}>
              <View style={[s.check, todosOk && s.checkOn]}>{todosOk && <Feather name="check" size={12} color="#FFF" />}</View>
              <Text style={s.consentTxt}>Todas as pessoas que aparecem na foto têm 18 anos ou mais e concordam em compartilhar ou enviar.</Text>
            </TouchableOpacity>
            <View style={s.acoes}>
              <TouchableOpacity style={[s.acaoPri, { backgroundColor: '#E1306C' }]} onPress={() => void compartilhar()} disabled={ocupado} accessibilityRole="button">
                {ocupado ? <ActivityIndicator color="#FFF" /> : <><Feather name="share" size={16} color="#FFF" /><Text style={s.acaoPriTxt}>Compartilhar</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={s.acaoSec} onPress={() => void salvar()} disabled={ocupado} accessibilityRole="button">
                <Feather name="download" size={16} color="#F5F5F7" /><Text style={s.acaoSecTxt}>Salvar</Text>
              </TouchableOpacity>
            </View>

            {/* Para a marca: duas autorizações separadas. Nada vai sem a pessoa tocar em "Enviar". */}
            {!!user && (
              <View style={s.marcaBox}>
                <Text style={s.marcaTit}>Para a {marca} (opcional)</Text>
                {enviada ? (
                  <View style={s.enviadaLinha}>
                    <Feather name="check-circle" size={16} color="#34D399" />
                    <Text style={s.enviadaTxt}>Enviada para a {marca}{marcaPosta ? ', que pode postar' : ''}. Você retira quando quiser em Conta › Minhas memórias.</Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity style={s.consent} onPress={() => { setParaMarca(!paraMarca); if (paraMarca) setMarcaPosta(false); }} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked: paraMarca }}>
                      <View style={[s.check, paraMarca && s.checkOn]}>{paraMarca && <Feather name="check" size={12} color="#FFF" />}</View>
                      <Text style={s.consentTxt}>{TEXTO_ENVIAR_MARCA(marca)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.consent, !paraMarca && { opacity: 0.4 }]} disabled={!paraMarca} onPress={() => setMarcaPosta(!marcaPosta)} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked: marcaPosta, disabled: !paraMarca }}>
                      <View style={[s.check, marcaPosta && s.checkOn]}>{marcaPosta && <Feather name="check" size={12} color="#FFF" />}</View>
                      <Text style={s.consentTxt}>{TEXTO_PUBLICAR_MARCA(marca)}</Text>
                    </TouchableOpacity>
                    {paraMarca && (
                      <TouchableOpacity style={[s.enviarMarca, { borderColor: cor }]} onPress={() => void enviarMarca()} disabled={enviando} accessibilityRole="button">
                        {enviando ? <ActivityIndicator color={cor} /> : <><Feather name="send" size={15} color={cor} /><Text style={[s.enviarMarcaTxt, { color: cor }]}>Enviar para a {marca}</Text></>}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}

            <TouchableOpacity onPress={() => void tirar()} style={s.outra} accessibilityRole="button"><Text style={s.outraTxt}>Tirar outra</Text></TouchableOpacity>
            <Text style={s.nota}>A foto fica só no seu celular, a não ser que você envie para a marca.</Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 999, minHeight: 46, marginTop: 14 },
  botaoTxt: { fontSize: 14, fontWeight: '800' },
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  folha: { alignItems: 'center', backgroundColor: '#14131C', borderRadius: 20, padding: 16, borderColor: '#232230', borderWidth: 1 },
  moldura: { alignItems: 'center', paddingTop: 52 },
  foto: { borderRadius: 2, backgroundColor: '#222' },
  topo: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  pilula: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  logo: { width: 16, height: 16 },
  pilulaTxt: { color: '#111111', fontSize: 13, fontWeight: '900' },
  rodape: { position: 'absolute', bottom: 10, left: 14, right: 14 },
  nome: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 3 },
  assinatura: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', opacity: 0.9, marginTop: 1 },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch' },
  consent: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', alignSelf: 'stretch', marginTop: 12 },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#4A4760', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkOn: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  consentTxt: { flex: 1, color: '#D6D3E0', fontSize: 12, lineHeight: 17 },
  acaoPri: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 23 },
  acaoPriTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  acaoSec: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#2E2E3D' },
  acaoSecTxt: { color: '#F5F5F7', fontSize: 14, fontWeight: '700' },
  outra: { paddingVertical: 10 },
  outraTxt: { color: '#A0A0B2', fontSize: 13, fontWeight: '700' },
  nota: { color: '#6E6B80', fontSize: 11, textAlign: 'center' },
  marcaBox: { alignSelf: 'stretch', marginTop: 14, borderTopWidth: 1, borderTopColor: '#232230', paddingTop: 10 },
  marcaTit: { color: '#F5F5F7', fontSize: 13, fontWeight: '800' },
  enviarMarca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 999, minHeight: 40, marginTop: 12 },
  enviarMarcaTxt: { fontSize: 13, fontWeight: '800' },
  enviadaLinha: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
  enviadaTxt: { flex: 1, color: '#D6D3E0', fontSize: 12, lineHeight: 17 },
});
