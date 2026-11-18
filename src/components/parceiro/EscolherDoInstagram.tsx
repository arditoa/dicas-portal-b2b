// Migração 138 — "Puxar do Instagram": grade com os últimos posts da casa; tocar puxa a imagem para o flyer
// e devolve sugestões da legenda (nome, data, hora).
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { conectarInstagram, importarDoInstagram, PostIg, postsDoInstagram, Sugestoes } from '../../lib/parceiro/instagram';
import { CP } from './TelaParceiro';

export default function EscolherDoInstagram({ visivel, localId, aoFechar, aoEscolher }: {
  visivel: boolean; localId: string; aoFechar: () => void; aoEscolher: (url: string, s: Sugestoes) => void;
}) {
  const [posts, setPosts] = useState<PostIg[] | null>(null);
  const [usuario, setUsuario] = useState<string | null>(null);
  const [erro, setErro] = useState<{ txt: string; conectar: boolean } | null>(null);
  const [puxando, setPuxando] = useState<string | null>(null);

  useEffect(() => {
    if (!visivel) return;
    setPosts(null); setErro(null);
    postsDoInstagram(localId).then((r) => { setPosts(r.posts); setUsuario(r.username); })
      .catch((e: any) => { setErro({ txt: e?.message || 'Não deu.', conectar: !!e?.conectar }); setPosts([]); });
  }, [visivel, localId]);

  const escolher = async (p: PostIg) => {
    setPuxando(p.id);
    try { const r = await importarDoInstagram(localId, p.id); aoEscolher(r.url, r.sugestoes); aoFechar(); }
    catch (e: any) { Alert.alert('Instagram', e?.message || 'Não deu.'); }
    finally { setPuxando(null); }
  };

  return (
    <Modal visible={visivel} animationType="slide" presentationStyle="pageSheet" onRequestClose={aoFechar}>
      <View style={s.tela}>
        <View style={s.topo}>
          <Text style={s.tit}>{usuario ? `@${usuario}` : 'Seu Instagram'}</Text>
          <TouchableOpacity onPress={aoFechar} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
        </View>
        <Text style={s.sub}>Toque no post do flyer. A imagem vem para a festa e a legenda ajuda a preencher.</Text>
        {posts === null ? <ActivityIndicator color={CP.rosa} style={{ marginTop: 40 }} /> : erro ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={s.sub}>{erro.txt}</Text>
            {erro.conectar && (
              <TouchableOpacity style={s.botao} onPress={() => conectarInstagram(localId).catch((e) => Alert.alert('Instagram', e.message))}>
                <Text style={s.botaoTxt}>Conectar Instagram</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={posts} keyExtractor={(p) => p.id} numColumns={3} contentContainerStyle={{ padding: 2 }}
            ListEmptyComponent={<Text style={[s.sub, { padding: 20 }]}>Nenhum post com imagem.</Text>}
            renderItem={({ item }) => (
              <Pressable style={s.celula} onPress={() => escolher(item)} disabled={!!puxando} accessibilityRole="button" accessibilityLabel={item.legenda.slice(0, 60) || 'Post'}>
                <Image source={{ uri: item.imagem }} style={s.img} />
                {item.tipo !== 'IMAGE' && <Feather name={item.tipo === 'VIDEO' ? 'film' : 'copy'} size={14} color="#FFF" style={s.marca} />}
                {puxando === item.id && <View style={s.carregando}><ActivityIndicator color="#FFF" /></View>}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: CP.bg },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18 },
  tit: { color: CP.texto, fontSize: 18, fontWeight: '900' },
  sub: { color: CP.dim, fontSize: 13, lineHeight: 18, paddingHorizontal: 16, marginTop: 6, marginBottom: 10 },
  celula: { flex: 1 / 3, aspectRatio: 4 / 5, padding: 2 },
  img: { flex: 1, borderRadius: 6, backgroundColor: '#1D1C29' },
  marca: { position: 'absolute', top: 8, right: 8 },
  carregando: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, borderRadius: 6, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  botao: { backgroundColor: '#C13584', borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
