import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Image, Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet, Text,
    TouchableOpacity,
    View
} from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryParam = params.category || '';
  const titleParam = params.title || 'Categoria';

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  // Filtros rápidos
  const [filterNear, setFilterNear] = useState(false);
  const [filterRating, setFilterRating] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, [categoryParam]);

  async function fetchBusinesses() {
    try {
      let query = supabase.from('businesses').select('*');
      if (categoryParam) {
        query = query.ilike('category', `%${categoryParam}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.log('Erro ao buscar categoria:', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Topo com Botão Voltar */}
      <View style={styles.header}>
        <TouchableOpacity 
          accessibilityRole="button"
          accessibilityLabel="Voltar para início"
          onPress={() => router.back()} 
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{titleParam}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Chips de Filtro */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          accessibilityRole="button"
          style={[styles.chip, filterNear && styles.chipActive]}
          onPress={() => setFilterNear(!filterNear)}
        >
          <Text style={[styles.chipText, filterNear && styles.chipTextActive]}>📍 Perto de mim</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          accessibilityRole="button"
          style={[styles.chip, filterRating && styles.chipActive]}
          onPress={() => setFilterRating(!filterRating)}
        >
          <Text style={[styles.chipText, filterRating && styles.chipTextActive]}>⭐ 4.5+</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Resultados */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.pink} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {businesses.length > 0 ? (
            businesses.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => setSelectedBusiness(item)}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={{ fontSize: 24, color: COLORS.textMuted }}>🌈</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.is_vip && <Text style={styles.vipBadge}>VIP</Text>}
                  </View>
                  <Text style={styles.cardSub}>📍 {item.neighborhood || 'Localização'}</Text>
                  {item.benefit && (
                    <View style={styles.benefitBadge}>
                      <Text style={styles.benefitText}>🎁 {item.benefit}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhum local encontrado em {titleParam}.</Text>
          )}
        </ScrollView>
      )}

      {/* Modal de Detalhes */}
      <Modal visible={!!selectedBusiness} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedBusiness?.name}</Text>
            <Text style={styles.modalText}>📍 Endereço: {selectedBusiness?.address || 'Não informado'}</Text>
            <Text style={styles.modalText}>🏙️ Bairro: {selectedBusiness?.neighborhood || 'Não informado'}</Text>
            
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedBusiness(null)}>
              <Text style={styles.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  backBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.cardBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  backText: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 13 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 15 },
  chip: { backgroundColor: COLORS.cardBg, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.textPrimary, fontWeight: 'bold' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', flexDirection: 'row' },
  cardImage: { width: 100, height: 100 },
  imagePlaceholder: { width: 100, height: 100, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, padding: 12, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: 'bold', flexShrink: 1 },
  vipBadge: { backgroundColor: COLORS.gold, color: '#0F172A', fontSize: 9, fontWeight: '900', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  cardSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  benefitBadge: { backgroundColor: COLORS.benefit, padding: 4, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  benefitText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.cardBg, width: '100%', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalText: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 6 },
  closeBtn: { backgroundColor: COLORS.border, marginTop: 15, padding: 12, borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: COLORS.textPrimary, fontWeight: 'bold' },
});