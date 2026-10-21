import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';

// Rodada 59 (parte 8) — mesmo bug de favorites.tsx (Meus Locais Salvos):
// esta tela inteira era MOCK_COUPONS, nunca ligada em nada real. Andrea
// ativou um cupom "entrada gratis" do Vezpa Bar pelo portal e ele nunca
// apareceu aqui — porque não tinha CHANCE de aparecer, era dado fixo.
// Agora mostra de verdade: check-ins pendentes (código ainda válido,
// esperando a casa confirmar) e o histórico de cupons já resgatados
// (checkins/cupons_resgatados, migration 010). O check-in em si é feito
// na página do local (ver business/[id].tsx) — aqui é só o acompanhamento.

interface CheckinPendente {
  id: string;
  codigo: string;
  expira_em: string;
  locais: { nome: string } | null;
  cupons: { titulo: string } | null;
}

interface CupomResgatado {
  id: string;
  resgatado_em: string;
  cupons: { titulo: string; locais: { nome: string } | null } | null;
}

export default function CouponsScreen() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [pendentes, setPendentes] = useState<CheckinPendente[]>([]);
  const [resgatados, setResgatados] = useState<CupomResgatado[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user?.id) {
      setPendentes([]);
      setResgatados([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [checkinsRes, resgatadosRes] = await Promise.all([
        supabase
          .from('checkins')
          .select('id, codigo, expira_em, locais(nome), cupons(titulo)')
          .eq('user_id', user.id)
          .is('validado_em', null)
          .is('cancelado_em', null)
          .gt('expira_em', new Date().toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('cupons_resgatados')
          .select('id, resgatado_em, cupons(titulo, locais(nome))')
          .eq('user_id', user.id)
          .order('resgatado_em', { ascending: false }),
      ]);

      setPendentes(((checkinsRes.data as any) || []) as CheckinPendente[]);
      setResgatados(((resgatadosRes.data as any) || []) as CupomResgatado[]);
    } catch (err) {
      console.error('Erro ao carregar cupons:', err);
      setPendentes([]);
      setResgatados([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const semNada = pendentes.length === 0 && resgatados.length === 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Meus Cupons & VIP</Text>
        </View>

        {!session ? (
          <View style={styles.emptyBox}>
            <Feather name="tag" size={28} color="#626274" />
            <Text style={styles.emptyText}>Entre na sua conta para ver seus cupons e check-ins.</Text>
          </View>
        ) : loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color="#E1306C" />
          </View>
        ) : semNada ? (
          <View style={styles.emptyBox}>
            <Feather name="tag" size={28} color="#626274" />
            <Text style={styles.emptyText}>
              Você ainda não fez check-in em nenhum cupom. Abra a página de um local com cupom ativo e
              toque em &quot;Fazer check-in pra resgatar&quot;.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            {pendentes.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Aguardando confirmação na casa</Text>
                {pendentes.map((p) => (
                  <View key={p.id} style={styles.couponCard}>
                    <View style={[styles.badgeStrip, { backgroundColor: '#7E57C2' }]}>
                      <Text style={styles.discountText}>AGUARDANDO</Text>
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.venueName}>{p.locais?.nome || 'Local'}</Text>
                      <Text style={styles.couponTitle}>{p.cupons?.titulo || 'Cupom'}</Text>
                      <View style={styles.codeRow}>
                        <View style={styles.codeBox}>
                          <Text style={styles.codeText}>{p.codigo}</Text>
                        </View>
                        <Text style={styles.expiraText}>
                          Válido até{' '}
                          {new Date(p.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {resgatados.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Já resgatados</Text>
                {resgatados.map((r) => (
                  <View key={r.id} style={styles.couponCard}>
                    <View style={[styles.badgeStrip, { backgroundColor: '#4CAF7D' }]}>
                      <Text style={styles.discountText}>RESGATADO</Text>
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.venueName}>{r.cupons?.locais?.nome || 'Local'}</Text>
                      <Text style={styles.couponTitle}>{r.cupons?.titulo || 'Cupom'}</Text>
                      <Text style={styles.expiraText}>{new Date(r.resgatado_em).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  emptyBox: { alignItems: 'center', gap: 10, marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 12, color: '#A0A0B0', textAlign: 'center', lineHeight: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#A0A0B0', textTransform: 'uppercase', marginBottom: -2, marginTop: 4 },
  couponCard: { backgroundColor: '#1C1B26', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2D2B3D' },
  badgeStrip: { paddingHorizontal: 14, paddingVertical: 6 },
  discountText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  cardBody: { padding: 14 },
  venueName: { fontSize: 12, color: '#A0A0B0', marginBottom: 2 },
  couponTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeBox: { backgroundColor: '#282836', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3D3D4E' },
  codeText: { color: '#FFD54F', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  expiraText: { fontSize: 11, color: '#A0A0B0' },
});
