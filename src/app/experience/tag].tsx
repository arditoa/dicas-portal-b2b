import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  gold: '#FFD54F',
  safeSpace: '#4CAF7D',
};

const DISTANCE_FILTERS = [
  { id: 'all_dist', label: 'Todas as distâncias', icon: 'compass', maxKm: 999 },
  { id: '1km', label: 'Até 1 km', icon: 'navigation', maxKm: 1 },
  { id: '5km', label: 'Até 5 km', icon: 'map-pin', maxKm: 5 },
];

interface BusinessItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  neighborhood?: string;
  distance?: string;
  rating?: number;
  is_featured?: boolean;
  diferencial?: string;
}

export default function ExperienceScreen() {
  const router = useRouter();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<BusinessItem[]>([]);
  const [selectedDistance, setSelectedDistance] = useState('all_dist');

  const tituloExperiencia = tag ? decodeURIComponent(tag) : 'Experiência';

  useEffect(() => {
    async function carregarLocaisPorExperiencia() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('businesses')
          .select('*')
          .ilike('category', `%${tituloExperiencia}%`)
          .limit(20);

        if (data && data.length > 0) {
          setItems(data as BusinessItem[]);
          setFeaturedItems(data.filter((b: any) => b.is_featured || b.plan_id === 'premium'));
        } else {
          // Mocks temáticos enquanto o banco do Supabase é alimentado
          const mockItems: BusinessItem[] = [
            {
              id: 'exp1',
              name: `Espaço Especial: ${tituloExperiencia}`,
              category: 'Recomendado',
              subcategory: 'Destaque Oficial',
              neighborhood: 'Pinheiros',
              distance: '1.2 km',
              rating: 4.9,
              is_featured: true,
              diferencial: `Perfeito para ${tituloExperiencia.toLowerCase()}`,
            },
            {
              id: 'exp2',
              name: 'Vezpa Lounge & Bar',
              category: 'Bares',
              subcategory: 'Ambiente Acolhedor',
              neighborhood: 'Jardins',
              distance: '2.4 km',
              rating: 4.8,
              is_featured: true,
              diferencial: 'Atendimento e iluminação especial',
            },
            {
              id: 'exp3',
              name: 'Zig Club Experience',
              category: 'Festas',
              subcategory: 'Pista & Lounge',
              neighborhood: 'Barra Funda',
              distance: '3.1 km',
              rating: 4.7,
              is_featured: false,
              diferencial: 'Música e coquetelaria exclusiva',
            },
            {
              id: 'exp4',
              name: 'Café Aurora & Bistrô',
              category: 'Gastronomia',
              subcategory: 'Mesas Aconchegantes',
              neighborhood: 'Vila Madalena',
              distance: '4.0 km',
              rating: 4.9,
              is_featured: false,
              diferencial: 'Opções veganas e drinks artesanais',
            },
          ];

          setItems(mockItems);
          setFeaturedItems(mockItems.filter((b) => b.is_featured));
        }
      } catch (e) {
        setItems([]);
        setFeaturedItems([]);
      } finally {
        setLoading(false);
      }
    }

    carregarLocaisPorExperiencia();
  }, [tituloExperiencia]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header Padrão com Logo Linear */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={require('@/assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />
        </View>

        {/* Título & Badge da Experiência */}
        <View style={styles.titleArea}>
          <View style={styles.badgeRow}>
            <Text style={styles.tagBadge}>INTENÇÃO DE BUSCA</Text>
            <View style={styles.badgeExperienciaChip}>
              <Text style={styles.badgeExperienciaText}>{tituloExperiencia}</Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>{tituloExperiencia}</Text>
          <Text style={styles.subTitle}>Locais e eventos ideais com curadoria para você</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Filtros de Distância (Chips em Roxo) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {DISTANCE_FILTERS.map((dist) => {
              const isSelected = selectedDistance === dist.id;
              return (
                <TouchableOpacity
                  key={dist.id}
                  style={[styles.distanceChip, isSelected && styles.distanceChipActive]}
                  onPress={() => setSelectedDistance(dist.id)}
                  activeOpacity={0.8}
                >
                  <Feather name={dist.icon as any} size={12} color={isSelected ? '#FFF' : '#8A8A9E'} style={{ marginRight: 6 }} />
                  <Text style={[styles.distanceChipText, isSelected && styles.distanceChipTextActive]}>{dist.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* BLOCO EM ALTA / PATROCINADOS DA EXPERIÊNCIA */}
          {featuredItems.length > 0 && (
            <View style={styles.emAltaSection}>
              <View style={styles.emAltaHeader}>
                <Feather name="trending-up" size={16} color={COLORS.gold} />
                <Text style={styles.emAltaTitle}>Em alta para {tituloExperiencia}</Text>
              </View>
              <FlatList
                data={featuredItems}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.emAltaPadding}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.emAltaCard}
                    onPress={() => router.push(`/business/${item.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.emAltaBadge}>
                      <Feather name="star" size={10} color={COLORS.pink} />
                      <Text style={styles.emAltaBadgeText}>RECOMENDADO</Text>
                    </View>
                    <Text style={styles.emAltaCardNome} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.emAltaCardSub}>{item.neighborhood} • {item.distance}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* LISTA PRINCIPAL DE LOCAIS */}
          <View style={styles.mainListArea}>
            <Text style={styles.sectionTitle}>Todas as Recomendações</Text>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.pink} />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Feather name="smile" size={24} color={COLORS.purple} />
                </View>
                <Text style={styles.emptyTitle}>Buscando as melhores escolhas!</Text>
                <Text style={styles.emptyText}>
                  Estamos selecionando novos locais para "{tituloExperiencia}". Em breve mais opções inclusivas.
                </Text>
              </View>
            ) : (
              items.map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  style={styles.card}
                  onPress={() => router.push(`/business/${biz.id}`)}
                  activeOpacity={0.88}
                >
                  <View style={styles.cardThumb}>
                    <Feather name="map-pin" size={20} color={COLORS.pink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{biz.name}</Text>
                    <Text style={styles.cardSubtext}>{biz.category} • {biz.neighborhood} • {biz.distance}</Text>
                    {biz.diferencial && (
                      <View style={styles.diferencialTag}>
                        <Feather name="check-circle" size={10} color={COLORS.safeSpace} style={{ marginRight: 4 }} />
                        <Text style={styles.diferencialText}>{biz.diferencial}</Text>
                      </View>
                    )}
                  </View>
                  <Feather name="chevron-right" size={18} color="#606070" />
                </TouchableOpacity>
              ))
            )}
          </View>

        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  center: { paddingVertical: 40, justifyContent: 'center', alignItems: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230', marginRight: 12 },
  logoLinear: { width: 140, height: 32 },

  titleArea: { paddingHorizontal: 16, marginVertical: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tagBadge: { fontSize: 10, fontWeight: '800', color: COLORS.purple },
  badgeExperienciaChip: { backgroundColor: 'rgba(225, 48, 108, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeExperienciaText: { fontSize: 10, fontWeight: '800', color: COLORS.pink },
  mainTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subTitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  scrollContent: { paddingBottom: 40 },
  chipsRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  distanceChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  distanceChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  distanceChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  distanceChipTextActive: { color: '#FFF' },

  emAltaSection: { marginBottom: 20 },
  emAltaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  emAltaTitle: { fontSize: 15, fontWeight: '800', color: COLORS.gold },
  emAltaPadding: { paddingHorizontal: 16, gap: 12 },
  emAltaCard: { width: 180, height: 100, backgroundColor: COLORS.card, borderRadius: 16, padding: 12, justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border },
  emAltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emAltaBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.pink },
  emAltaCardNome: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  emAltaCardSub: { fontSize: 11, color: COLORS.textSecondary },

  mainListArea: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 10 },
  cardThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(225, 48, 108, 0.12)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardSubtext: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  diferencialTag: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  diferencialText: { fontSize: 11, color: COLORS.safeSpace, fontWeight: '600' },

  emptyCard: { height: 220, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(126, 87, 194, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  emptyText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
});