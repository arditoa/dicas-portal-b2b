// Rodada 148 — Conta › Minhas memórias (migração 122): as fotos que a pessoa tirou nas casas.
// Só ela vê. Em cada foto: enviar ou não para a casa, autorizar ou não a casa publicar, compartilhar e apagar.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import TopoApp from '../components/TopoApp';
import { TituloTela } from '../components/CabecalhoTela';
import { useAuth } from '../lib/authContext';
import { apagarMemoria, compartilharFoto, dataHora, Memoria, minhasMemorias, mudarAutorizacao, TEXTO_TODOS } from '../lib/memorias';

export default function MinhasMemorias() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [lista, setLista] = useState<Memoria[] | null>(null);
  const [aberta, setAberta] = useState<Memoria | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const lado = Math.floor((width - 32 - 8) / 3);

  const carregar = useCallback(async () => {
    if (!user?.id) { setLista([]); return; }
    const l = await minhasMemorias(user.id);
    setLista(l);
    setAberta((a) => (a ? l.find((x) => x.id === a.id) || null : null));
  }, [user?.id]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const mudar = async (campos: Parameters<typeof mudarAutorizacao>[1]) => {
    if (!aberta) return;
    setOcupado(true);
    try { await mudarAutorizacao(aberta.id, campos); await carregar(); }
    catch (e: any) { Alert.alert('Minhas memórias', e?.message || 'Não deu para salvar.'); }
    finally { setOcupado(false); }
  };

  const ligarPublicar = (v: boolean) => {
    if (!v) return void mudar({ casa_pode_publicar: false });
    Alert.alert('Autorizar a casa a publicar?', TEXTO_TODOS, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmo', onPress: () => void mudar({ casa_pode_publicar: true, todos_concordam: true }) },
    ]);
  };

  const apagar = () => {
    if (!aberta) return;
    Alert.alert('Apagar esta foto?', 'Ela some de Minhas memórias e da casa. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        setOcupado(true);
        try { await apagarMemoria(aberta); setAberta(null); await carregar(); }
        catch (e: any) { Alert.alert('Apagar', e?.message || 'Não deu para apagar.'); }
        finally { setOcupado(false); }
      } },
    ]);
  };

  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View style={{ marginBottom: 12 }}><TituloTela titulo="Minhas memórias" subtitulo="Só você vê, a menos que escolha enviar. Cada foto fica 90 dias." discreto semMargem /></View>
        {lista === null ? <ActivityIndicator color="#E1306C" style={{ marginTop: 30 }} /> : lista.length === 0 ? (
          <View style={s.vazio}>
            <Feather name="camera" size={26} color="#626274" />
            <Text style={s.vazioTxt}>Nenhuma foto ainda. Na página de uma casa, toque em "Foto da galera".</Text>
          </View>
        ) : (
          <View style={s.grade}>
            {lista.map((m) => (
              <TouchableOpacity key={m.id} onPress={() => setAberta(m)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Foto em ${m.locais?.nome || 'uma casa'}`}>
                {m.url ? <Image source={{ uri: m.url }} style={{ width: lado, height: lado * 1.25, borderRadius: 10, backgroundColor: '#222' }} /> : <View style={{ width: lado, height: lado * 1.25, borderRadius: 10, backgroundColor: '#222' }} />}
                {m.enviar_para_casa && (
                  <View style={s.selo}><Feather name={m.casa_pode_publicar ? 'globe' : 'send'} size={10} color="#FFF" /></View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!aberta} transparent animationType="slide" onRequestClose={() => setAberta(null)}>
        <Pressable style={s.veu} onPress={() => setAberta(null)}>
          <Pressable style={s.folha} onPress={() => {}}>
            {aberta && (
              <ScrollView>
                {aberta.url && <Image source={{ uri: aberta.url }} style={s.grande} />}
                <Text style={s.casa}>{aberta.locais?.nome || aberta.legenda || 'Foto'}</Text>
                {!!aberta.legenda && !!aberta.locais?.nome && <Text style={s.legenda}>{aberta.legenda}</Text>}
                <Text style={s.data}>{dataHora(aberta.created_at)} · vence em {new Date(aberta.expira_em).toLocaleDateString('pt-BR')}</Text>

                {!!aberta.local_id && (
                  <>
                    <View style={s.linha}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.linhaTit}>Enviada para a casa</Text>
                        <Text style={s.linhaSub}>{aberta.enviar_para_casa ? `A casa pode ver e baixar · desde ${dataHora(aberta.enviado_em)}` : 'Só você vê'}</Text>
                      </View>
                      <Switch value={aberta.enviar_para_casa} disabled={ocupado} onValueChange={(v) => void mudar(v ? { enviar_para_casa: true } : { enviar_para_casa: false, casa_pode_publicar: false })} trackColor={{ true: '#4CAF7D', false: '#3A3950' }} thumbColor="#FFF" />
                    </View>
                    <View style={[s.linha, !aberta.enviar_para_casa && { opacity: 0.4 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.linhaTit}>A casa pode publicar</Text>
                        <Text style={s.linhaSub}>{aberta.casa_pode_publicar ? `Autorizado em ${dataHora(aberta.publicar_em)}` : 'Redes sociais e materiais da casa'}</Text>
                      </View>
                      <Switch value={aberta.casa_pode_publicar} disabled={ocupado || !aberta.enviar_para_casa} onValueChange={ligarPublicar} trackColor={{ true: '#4CAF7D', false: '#3A3950' }} thumbColor="#FFF" />
                    </View>
                    <Text style={s.nota}>Se você retirar, a casa perde o acesso no app. Para tirar algo que já foi publicado, peça à casa ou fale com a equipe Dicas.</Text>
                  </>
                )}

                {!!aberta.acao_id && (aberta.enviar_para_marca || aberta.marca_pode_publicar) && (
                  <>
                    <View style={s.linha}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.linhaTit}>Enviada para a marca</Text>
                        <Text style={s.linhaSub}>{aberta.enviar_para_marca ? `Só a marca e a equipe Dicas veem · desde ${dataHora(aberta.enviado_marca_em ?? null)}` : 'Retirada'}</Text>
                      </View>
                      <Switch value={!!aberta.enviar_para_marca} disabled={ocupado || !aberta.enviar_para_marca} onValueChange={(v) => { if (!v) void mudar({ enviar_para_marca: false, marca_pode_publicar: false }); }} trackColor={{ true: '#4CAF7D', false: '#3A3950' }} thumbColor="#FFF" />
                    </View>
                    <View style={[s.linha, !aberta.enviar_para_marca && { opacity: 0.4 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.linhaTit}>A marca pode postar</Text>
                        <Text style={s.linhaSub}>{aberta.marca_pode_publicar ? `Autorizado em ${dataHora(aberta.publicar_marca_em ?? null)}` : 'Redes sociais da marca'}</Text>
                      </View>
                      <Switch value={!!aberta.marca_pode_publicar} disabled={ocupado || !aberta.enviar_para_marca} onValueChange={(v) => void mudar({ marca_pode_publicar: v })} trackColor={{ true: '#4CAF7D', false: '#3A3950' }} thumbColor="#FFF" />
                    </View>
                    <Text style={s.nota}>Se você retirar, a marca deixa de receber esta foto pelo app. Para tirar algo que já foi postado, fale com a equipe Dicas: nós pedimos à marca.</Text>
                  </>
                )}

                <View style={s.botoes}>
                  <TouchableOpacity style={s.btnSec} disabled={ocupado || !aberta.url} onPress={() => aberta.url && compartilharFoto(aberta.url, 'memoria').catch((e) => Alert.alert('Compartilhar', e?.message || 'Não deu agora.'))} accessibilityRole="button">
                    <Feather name="share" size={15} color="#F5F5F7" /><Text style={s.btnSecTxt}>Compartilhar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnApagar} disabled={ocupado} onPress={apagar} accessibilityRole="button">
                    <Feather name="trash-2" size={15} color="#FF6B6B" /><Text style={s.btnApagarTxt}>Apagar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  titulo: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  sub: { color: '#A0A0B2', fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 14 },
  vazio: { alignItems: 'center', gap: 10, padding: 30 },
  vazioTxt: { color: '#A0A0B2', fontSize: 13, textAlign: 'center' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  selo: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '92%', borderColor: '#232230', borderWidth: 1 },
  grande: { width: '100%', aspectRatio: 4 / 5, borderRadius: 14, backgroundColor: '#222', maxHeight: 380, alignSelf: 'center' },
  casa: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 12 },
  legenda: { color: '#D6D3E0', fontSize: 13, marginTop: 2 },
  data: { color: '#8E8BA3', fontSize: 12, marginTop: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#232230' },
  linhaTit: { color: '#F5F5F7', fontSize: 14, fontWeight: '700' },
  linhaSub: { color: '#A0A0B2', fontSize: 12, marginTop: 2 },
  nota: { color: '#6E6B80', fontSize: 11.5, lineHeight: 16, marginTop: 8 },
  botoes: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnSec: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#2E2E3D' },
  btnSecTxt: { color: '#F5F5F7', fontSize: 14, fontWeight: '700' },
  btnApagar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#4A2030' },
  btnApagarTxt: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },
});
