// Rodada 76 — lista "Minhas ocorrências".
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../lib/authContext';
import { STATUS_COR, STATUS_ROTULO, dataBr, rotuloCategoria } from '../../lib/ocorrencias';
import { supabase } from '../../lib/supabase';

type Item = { id: string; protocolo: string; categoria: string; status: string; data_fato: string; created_at: string };

export default function MinhasOcorrencias() {
  const router = useRouter();
  const { session, user } = useAuth();
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setItens([]);
        return;
      }
      supabase
        .from('ocorrencias')
        .select('id, protocolo, categoria, status, data_fato, created_at')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) setErro('Não foi possível carregar agora. Tente de novo em instantes.');
          else setErro('');
          setItens((data as Item[]) ?? []);
        });
    }, [user])
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Minhas ocorrências</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {!session && (
            <Text style={styles.vazio}>Entre na sua conta (aba Perfil) para ver as suas ocorrências.</Text>
          )}
          {session && itens === null && <ActivityIndicator color="#E1306C" />}
          {!!erro && <Text style={styles.erro}>{erro}</Text>}
          {session && itens && itens.length === 0 && !erro && (
            <Text style={styles.vazio}>Você ainda não registrou nenhuma ocorrência.</Text>
          )}
          {itens?.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/ocorrencia/[id]', params: { id: o.id } })}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.protocolo}>{o.protocolo}</Text>
                <Text style={styles.cat}>{rotuloCategoria(o.categoria)}</Text>
                <Text style={styles.data}>Fato em {dataBr(o.data_fato)}</Text>
              </View>
              <View style={[styles.badge, { borderColor: STATUS_COR[o.status] ?? '#8A8AA0' }]}>
                <Text style={[styles.badgeTxt, { color: STATUS_COR[o.status] ?? '#8A8AA0' }]}>
                  {STATUS_ROTULO[o.status] ?? o.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.novo} onPress={() => router.push('/ocorrencia/nova')}>
            <Feather name="plus" size={15} color="#FFF" />
            <Text style={styles.novoTxt}>Registrar nova ocorrência</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  vazio: { color: '#A0A0B2', fontSize: 13, lineHeight: 19 },
  erro: { color: '#FF6B6B', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1C1B26', borderRadius: 14, borderWidth: 1, borderColor: '#2D2B3D', padding: 14 },
  protocolo: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  cat: { color: '#C8C8D6', fontSize: 13 },
  data: { color: '#8A8AA0', fontSize: 12 },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 130 },
  badgeTxt: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  novo: { flexDirection: 'row', gap: 8, backgroundColor: '#E1306C', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  novoTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
