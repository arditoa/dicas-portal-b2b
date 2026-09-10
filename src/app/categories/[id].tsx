import { THEME } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mapeamento completo das categorias e suas subcategorias
const CATEGORY_CONFIG: Record<
  string,
  {
    title: string;
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
    subCategories: { id: string; name: string }[];
  }
> = {
  gastronomy: {
    title: 'Gastronomia',
    icon: 'coffee',
    iconColor: '#FFB74D',
    subCategories: [
      { id: 'all', name: 'Tudo' },
      { id: 'bares', name: 'Bares' },
      { id: 'cafes', name: 'Cafés' },
      { id: 'restaurantes', name: 'Restaurantes' },
    ],
  },
  culture: {
    title: 'Cultura',
    icon: 'home',
    iconColor: '#7E57C2',
    subCategories: [
      { id: 'all', name: 'Tudo' },
      { id: 'teatros', name: 'Teatros' },
      { id: 'galerias', name: 'Galerias' },
      { id: 'feiras', name: 'Feiras Independência' },
    ],
  },
  tourism: {
    title: 'Turismo',
    icon: 'send',
    iconColor: '#5C6BC0',
    subCategories: [
      { id: 'all', name: 'Tudo' },
      { id: 'pousadas', name: 'Pousadas' },
      { id: 'hoteis', name: 'Hotéis' },
      { id: 'agencias', name: 'Agências de Turismo' },
      { id: 'roteiros', name: 'Roteiros' },
    ],
  },
};

const MOCK_ITEMS = [
  // Gastronomia
  { id: 'bar-castro', categoryId: 'gastronomy', subCategory: 'bares', name: 'Bar Castro', typeLabel: 'Bar', neighborhood: 'Consolação', distance: '800m', rating: '4.9', coupon: 'Double chopp para membros', badge: 'LGBT+ Friendly', instagram: '@barcastrosp', color: '#E1306C' },
  { id: 'cafe-safado', categoryId: 'gastronomy', subCategory: 'cafes', name: 'Café Safado', typeLabel: 'Café', neighborhood: 'Frei Caneca', distance: '1.2km', rating: '4.8', badge: 'LGBT+ Friendly', instagram: '@cafesafado', color: '#FFB74D' },
  { id: 'bistro-cores', categoryId: 'gastronomy', subCategory: 'restaurantes', name: 'Bistrô das Cores', typeLabel: 'Restaurante', neighborhood: 'Pinheiros', distance: '2.1km', rating: '5.0', coupon: '10% OFF no prato principal', badge: 'LGBT+ Friendly', instagram: '@bistrodascores', color: '#4FC3F7' },

  // Cultura
  { id: 'teatro-rainbow', categoryId: 'culture', subCategory: 'teatros', name: 'Teatro Rainbow', typeLabel: 'Teatro', neighborhood: 'Consolação', distance: '2km', rating: '4.4', instagram: '@teatrorainbowsp', color: '#7E57C2' },
  { id: 'galeria-pride', categoryId: 'culture', subCategory: 'galerias', name: 'Galeria Pride Art', typeLabel: 'Galeria', neighborhood: 'Vila Madalena', distance: '1.8km', rating: '4.9', badge: 'LGBT+ Friendly', instagram: '@galeriaprideart', color: '#E1306C' },
  { id: 'feira-miolo', categoryId: 'culture', subCategory: 'feiras', name: 'Feira Miolo Independência', typeLabel: 'Feira Independência', neighborhood: 'Centro', distance: '3.1km', rating: '4.8', coupon: 'Desconto para membros', badge: 'LGBT+ Friendly', instagram: '@feiramiolo', color: '#81C784' },

  // Turismo
  { id: 'pousada-vista-verde', categoryId: 'tourism', subCategory: 'pousadas', name: 'Pousada Vista Verde', typeLabel: 'Pousada', neighborhood: 'Vila Madalena', distance: '2.4km', rating: '4.6', badge: 'LGBT+ Friendly', instagram: '@pousadavistaverde', color: '#D81B60' },
  { id: 'hotel-aurora', categoryId: 'tourism', subCategory: 'hoteis', name: 'Hotel Aurora Pinheiros', typeLabel: 'Hotel', neighborhood: 'Pinheiros', distance: '900m', rating: '4.8', coupon: 'Cupom de 15% para membros', badge: 'LGBT+ Friendly', instagram: '@hotelaurorapinheiros', color: '#9C27B0' },
  { id: 'rota-livre', categoryId: 'tourism', subCategory: 'agencias', name: 'Rota Livre Turismo', typeLabel: 'Agência de Turismo', neighborhood: 'Centro', distance: '3km', rating: '4.7', coupon: 'Pacotes com desconto', badge: 'LGBT+ Friendly', instagram: '@rotalivreturismo', color: '#7E57C2' },
];

export default function CategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedSub, setSelectedSub] = useState('all');

  const categoryKey = (id || 'gastronomy').toLowerCase();
  const currentConfig = CATEGORY_CONFIG[categoryKey] || {
    title: id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Categoria',
    icon: 'grid',
    iconColor: THEME.pink,
    subCategories: [{ id: 'all', name: 'Tudo' }],
  };

  const categoryItems = MOCK_ITEMS.filter(item => item.categoryId === categoryKey);
  const filteredData = selectedSub === 'all'
    ? categoryItems
    : categoryItems.filter(item => item.subCategory === selectedSub);

  return (
    <View style={styles.container}>
      {/* Topo / Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={THEME.text} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View style={styles.categoryIconBadge}>
            <Feather name={currentConfig.icon} size={16} color={currentConfig.iconColor} />
          </View>
          <Text style={styles.headerTitle}>{currentConfig.title}</Text>
        </View>
      </View>

      {/* Chips de Subcategorias (Filtros) */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {currentConfig.subCategories.map((sub) => {
            const isSelected = selectedSub === sub.id;
            return (
              <TouchableOpacity
                key={sub.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedSub(sub.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filtros Secundários */}
      <View style={styles.secondaryFilters}>
        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="map-pin" size={13} color={THEME.textDim} style={{ marginRight: 6 }} />
          <Text style={styles.filterBtnText}>Distância</Text>
          <Feather name="chevron-down" size={13} color={THEME.textDim} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="star" size={13} color={THEME.gold} style={{ marginRight: 6 }} />
          <Text style={styles.filterBtnText}>Estrelas</Text>
          <Feather name="chevron-down" size={13} color={THEME.textDim} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterBtnText}>Opções</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.resultCount}>
        {filteredData.length} resultados em {currentConfig.title}
      </Text>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/venue/${item.id}`)}
            activeOpacity={0.88}
          >
            <View style={styles.cardContent}>
              <View style={[styles.imagePlaceholder, { backgroundColor: item.color }]} />

              <View style={styles.infoCol}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={12} color={THEME.gold} style={{ marginRight: 4 }} />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                </View>

                <Text style={styles.subtitleText}>
                  {item.typeLabel} • {item.neighborhood} • {item.distance}
                </Text>

                {item.coupon && (
                  <View style={styles.couponTag}>
                    <Feather name="tag" size={10} color="#FFD54F" style={{ marginRight: 4 }} />
                    <Text style={styles.couponText}>{item.coupon}</Text>
                  </View>
                )}

                {item.badge && (
                  <View style={styles.badgeRow}>
                    <View style={styles.friendlyBadge}>
                      <Feather name="shield" size={10} color="#81C784" style={{ marginRight: 4 }} />
                      <Text style={styles.friendlyText}>{item.badge}</Text>
                    </View>
                  </View>
                )}

                {item.instagram && (
                  <View style={styles.instaRow}>
                    <Feather name="camera" size={11} color={THEME.textDim} style={{ marginRight: 4 }} />
                    <Text style={styles.instaText}>Instagram • {item.instagram}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216', paddingTop: 52 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E1E26', justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryIconBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#282836', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  chipsContainer: { marginBottom: 12 },
  chipsScroll: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E26', borderWidth: 1, borderColor: '#2E2E3D' },
  chipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#A0A0B0' },
  chipTextActive: { color: '#FFFFFF' },
  secondaryFilters: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E26', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#2E2E3D' },
  filterBtnText: { fontSize: 12, color: '#A0A0B0', fontWeight: '500' },
  resultCount: { fontSize: 12, color: '#606070', paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: '#1A1A22', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#262632' },
  cardContent: { flexDirection: 'row', gap: 12 },
  imagePlaceholder: { width: 64, height: 64, borderRadius: 12 },
  infoCol: { flex: 1, gap: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1, marginRight: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  subtitleText: { fontSize: 12, color: '#A0A0B0' },
  couponTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#332A15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  couponText: { fontSize: 10, color: '#FFD54F', fontWeight: '600' },
  badgeRow: { flexDirection: 'row', marginTop: 2 },
  friendlyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B2E1E', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  friendlyText: { fontSize: 10, color: '#81C784', fontWeight: '700' },
  instaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  instaText: { fontSize: 11, color: '#606070' },
});