import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const CATEGORY_NAMES: Record<string, string> = {
  bares: 'Bares & Vida Noturna',
  places: 'Bares & Vida Noturna',
  gastronomia: 'Gastronomia',
  gastronomy: 'Gastronomia',
  festas: 'Festas & Eventos',
  events: 'Festas & Eventos',
  cultura: 'Cultura & Lazer',
  culture: 'Cultura & Lazer',
  tourism: 'Dicas Trip (Turismo)',
  turismo: 'Dicas Trip (Turismo)',
  beleza: 'Beleza & Bem-Estar',
  '18plus': 'Espaços 18+',
  mais18: 'Espaços 18+',
  lojas: 'Lojas & Compras',
  servicos: 'Serviços Inclusivos',
  lazer: 'Lazer & Atividades',
  all: 'Todos os Locais',
};

const SUBCATEGORIES: Record<string, string[]> = {
  bares: ['Todas', 'Pubs', 'Speakeasy', 'Rooftops', 'Karaokê', 'Happy Hour'],
  gastronomia: ['Todas', 'Restaurantes', 'Cafés', 'Padarias', 'Hamburguerias', 'Docerias', 'Vegano'],
  festas: ['Todas', 'Baladas', 'Festivais', 'Open Bar', 'Drag Shows', 'Sunsets'],
  cultura: ['Todas', 'Teatros', 'Centros Culturais', 'Cinemas', 'Exposições', 'Museus'],
  tourism: ['Todas', 'Hotéis', 'Pousadas', 'Roteiros Guiados', 'Pontos Turísticos'],
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
  is_featured?: boolean;
}

export default function BusinessDetailOrCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const currentSlug = (id || '').toLowerCase();
  
  const knownCategories = [
    'bares', 'places', 'gastronomia', 'gastronomy',
    'festas', 'events', 'cultura', 'culture',
    'tourism', 'turismo', 'beleza', '18plus', 'mais18',
    'lojas', 'servicos', 'lazer', 'all'
  ];
  
  const isCategory = knownCategories.includes(currentSlug);

  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<BusinessItem | null>(null);
  const [categoryItems, setCategoryItems] = useState<BusinessItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<BusinessItem[]>([]);
  
  const [selectedSubcategory, setSelectedSubcategory] = useState('Todas');
  const [selectedDistance, setSelectedDistance] = useState('all_dist');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      if (isCategory) {
        try {
          const { data } = await supabase
            .from('businesses')
            .select('*')
            .ilike('category', `%${currentSlug}%`);

          if (data && data.length > 0) {
            setCategoryItems(data as BusinessItem[]);
            setFeaturedItems(data.filter((b: any) => b.is_featured || b.plan_id === 'premium'));
          } else {
            const mockData: BusinessItem[] = [
              { id: 'm1', name: `${CATEGORY_NAMES[currentSlug] || 'Local'} VIP`, category: currentSlug, subcategory: 'Destaque', neighborhood: 'Jardins', distance: '1.2 km', is_featured: true },
              { id: 'm2', name: 'Espaço Parceiro Premium', category: currentSlug, subcategory: 'Destaque', neighborhood: 'Pinheiros', distance: '2.5 km', is_featured: true },
              { id: 'm3', name: 'Local Acolhedor 1', category: currentSlug, subcategory: 'Geral', neighborhood: 'Centro', distance: '3.0 km' },
              { id: 'm4', name: 'Local Acolhedor 2', category: currentSlug, subcategory: 'Geral', neighborhood: 'Vila Madalena', distance: '4.8 km' },
            ];
            setCategoryItems(mockData);
            setFeaturedItems(mockData.filter((b) => b.is_featured));
          }
        } catch (e) {
          setCategoryItems([]);
          setFeaturedItems([]);
        }
      } else {
        try {
          const { data } = await supabase.from('businesses').select('*').eq('id', currentSlug).single();
          if (data) setDetailItem(data as BusinessItem);
        } catch (e) {
          setDetailItem(null);
        }
      }
      setLoading(false);
    }

    loadData();
  }, [currentSlug]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#E1306C" />
      </View>
    );
  }

  if (isCategory) {
    const subList = SUBCATEGORIES[currentSlug] || SUBCATEGORIES['bares'];

    const filteredItems = categoryItems.filter((biz) => {
      const bizSub = (biz.subcategory || '').toLowerCase();
      return selectedSubcategory === 'Todas' || bizSub.includes(selectedSubcategory.toLowerCase());
    });

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          
          {/* Topo / Header com Ícone */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Feather name="chevron-left" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <Image
              source={require('@/assets/images/logo-icon.png')}
              style={styles.headerIconSquare}
              resizeMode="contain"
            />
          </View>

          {/* Nome da Categoria em destaque na linha de baixo */}
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryTitleText}>{CATEGORY_NAMES[currentSlug] || 'Categoria'}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollCategoryContent} showsVerticalScrollIndicator={false}>

            {/* Subcategorias */}
            {subList && subList.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {subList.map((sub) => {
                  const isSelected = selectedSubcategory === sub;
                  return (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setSelectedSubcategory(sub)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Filtros de Distância */}
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

            {/* Bloco Em Alta */}
            {featuredItems.length > 0 && (
              <View style={styles.emAltaSection}>
                <View style={styles.emAltaHeader}>
                  <Feather name="trending-up" size={16} color="#FFD54F" />
                  <Text style={styles.emAltaTitle}>Em alta</Text>
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
                        <Feather name="star" size={10} color="#E1306C" />
                        <Text style={styles.emAltaBadgeText}>PATROCINADO</Text>
                      </View>
                      <Text style={styles.emAltaCardNome} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.emAltaCardSub}>{item.neighborhood || 'São Paulo'} • {item.distance || 'Prox.'}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Lista Principal */}
            <View style={styles.mainListArea}>
              <Text style={styles.sectionTitle}>Todos os Locais</Text>

              {filteredItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <Feather name="info" size={22} color="#7E57C2" />
                  </View>
                  <Text style={styles.emptyText}>
                    Nenhum local cadastrado nesta subcategoria ainda.
                  </Text>
                </View>
              ) : (
                filteredItems.map((biz) => (
                  <TouchableOpacity
                    key={biz.id}
                    style={styles.card}
                    onPress={() => router.push(`/business/${biz.id}`)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.cardThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{biz.name}</Text>
                      <Text style={styles.cardSubtext}>{biz.subcategory || 'Local'} • {biz.neighborhood || 'SP'} • {biz.distance || 'Prox.'}</Text>
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollDetail}>
          <TouchableOpacity style={styles.backBtnAbsolute} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.heroBanner}>
            <View style={styles.safeBadge}>
              <Feather name="shield" size={12} color="#4CAF7D" style={{ marginRight: 4 }} />
              <Text style={styles.safeBadgeText}>Espaço Seguro LGBT+</Text>
            </View>
          </View>

          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{detailItem?.name || 'Local Parceiro'}</Text>
            <Text style={styles.detailSubtext}>{detailItem?.category} • {detailItem?.neighborhood || 'São Paulo'}</Text>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL('https://instagram.com')}
            >
              <Feather name="instagram" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Ver no Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.mapBtn]}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Feather name="map-pin" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Ver no Mapa Interativo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230', marginRight: 12 },
  headerIconSquare: { width: 32, height: 32 },
  
  categoryTitleContainer: { paddingHorizontal: 16, marginBottom: 12 },
  categoryTitleText: { fontSize: 22, fontWeight: '800', color: '#FFF' },

  backBtnAbsolute: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  
  scrollCategoryContent: { paddingBottom: 40 },
  chipsRow: { paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  chipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#A0A0B2' },
  chipTextActive: { color: '#FFFFFF' },

  distanceChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  distanceChipActive: { backgroundColor: '#7E57C2', borderColor: '#7E57C2' },
  distanceChipText: { fontSize: 12, fontWeight: '600', color: '#8A8A9E' },
  distanceChipTextActive: { color: '#FFFFFF' },

  emAltaSection: { marginTop: 8, marginBottom: 20 },
  emAltaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  emAltaTitle: { fontSize: 15, fontWeight: '800', color: '#FFD54F' },
  emAltaPadding: { paddingHorizontal: 16, gap: 12 },
  emAltaCard: { width: 180, height: 100, backgroundColor: '#161520', borderRadius: 16, padding: 12, justifyContent: 'space-between', borderWidth: 1, borderColor: '#232230' },
  emAltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emAltaBadgeText: { fontSize: 9, fontWeight: '800', color: '#E1306C' },
  emAltaCardNome: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  emAltaCardSub: { fontSize: 11, color: '#A0A0B2' },

  mainListArea: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  
  emptyCard: { height: 200, backgroundColor: '#161520', borderRadius: 20, borderWidth: 1, borderColor: '#232230', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(126, 87, 194, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#A0A0B2', textAlign: 'center' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161520', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#232230', gap: 12, marginBottom: 10 },
  cardThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A1926' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  cardSubtext: { fontSize: 12, color: '#A0A0B2', marginTop: 2 },

  scrollDetail: { paddingBottom: 40 },
  heroBanner: { height: 180, backgroundColor: '#E1306C', justifyContent: 'flex-end', padding: 16 },
  safeBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 125, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  safeBadgeText: { fontSize: 11, fontWeight: '700', color: '#4CAF7D' },
  detailBody: { padding: 20 },
  detailTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  detailSubtext: { fontSize: 13, color: '#A0A0B2', marginBottom: 20 },
  actionBtn: { flexDirection: 'row', height: 48, backgroundColor: '#E1306C', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mapBtn: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});