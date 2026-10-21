import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../lib/authContext';
import { CATEGORIA_REAL_LABEL } from '../lib/categorias';
import { supabase } from '../lib/supabase';

// Rodada 59 (parte 8) — bug real reportado pela Andrea, testando como
// usuária final: favoritar um local funcionava (favoritos_locais recebia
// a linha certinho), mas "Meus Locais Salvos" nunca mostrava nada. Causa:
// esta tela inteira era MOCK_FAVORITES, sobrando de uma fase bem anterior
// do protótipo — nunca tinha sido ligada na tabela real. Agora busca de
// verdade os favoritos do usuário logado.

interface LocalFavorito {
  id: string;
  nome: string;
  categoria: string;
  bairro: string | null;
  cidade: string;
  foto_capa_url: string | null;
  status: string;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [locais, setLocais] = useState<LocalFavorito[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user?.id) {
      setLocais([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favoritos_locais')
        .select(
          'local_id, locais(id, nome, categoria, bairro, cidade, foto_capa_url, status)'
        )
        .eq('user_id', user.id);

      if (error) throw error;

      const itens = (((data as any) || []) as { locais: any }[])
        .map((row) => row.locais)
        .filter((l) => l && l.status === 'aprovado') as LocalFavorito[];
      setLocais(itens);
    } catch (err) {
      console.error('Erro ao carregar locais salvos:', err);
      setLocais([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Otimista (some da lista na hora) — se a chamada falhar, recarrega pra
  // não deixar a tela mentindo sobre o que está salvo de verdade.
  const handleRemover = async (localId: string) => {
    if (!user?.id) return;
    setLocais((prev) => prev.filter((l) => l.id !== localId));
    try {
      const { error } = await supabase
        .from('favoritos_locais')
        .delete()
        .eq('local_id', localId)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao remover favorito:', err);
      carregar();
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Meus Locais Salvos</Text>
        </View>

        {!session ? (
          <View style={styles.emptyBox}>
            <Feather name="heart" size={28} color="#626274" />
            <Text style={styles.emptyText}>Entre na sua conta para ver os locais que você salvou.</Text>
          </View>
        ) : loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color="#E1306C" />
          </View>
        ) : locais.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="heart" size={28} color="#626274" />
            <Text style={styles.emptyText}>
              Você ainda não salvou nenhum local. Toque no coração de um local pra guardar aqui.
            </Text>
          </View>
        ) : (
          <FlatList
            data={locais}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20, gap: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/business/${item.id}` as any)}
                activeOpacity={0.85}
              >
                {item.foto_capa_url ? (
                  <Image source={{ uri: item.foto_capa_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbVazio]}>
                    <Feather name="map-pin" size={18} color="#E1306C" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.nome}
                  </Text>
                  <Text style={styles.cardSub}>
                    {CATEGORIA_REAL_LABEL[item.categoria] || item.categoria} • {item.bairro || item.cidade}
                  </Text>
                </View>
                <TouchableOpacity style={styles.heartBtn} onPress={() => handleRemover(item.id)}>
                  <Feather name="heart" size={16} color="#E1306C" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  emptyBox: { alignItems: 'center', gap: 10, marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 12, color: '#A0A0B2', textAlign: 'center', lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161520',
    padding: 12,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#232230',
  },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  thumbVazio: { backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  cardSub: { fontSize: 12, color: '#A0A0B2', marginTop: 2 },
  heartBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0B0B0E', justifyContent: 'center', alignItems: 'center' },
});
