import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  pink: '#E1306C',
  accentTag: 'rgba(225, 48, 108, 0.15)',
};

// Categorias principais
const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'bars', label: '🍺 Bares & Night' },
  { id: 'gastro', label: '🍕 Gastronomia' },
  { id: 'cafes', label: '☕ Cafés & Brunch' },
  { id: 'hotels', label: '🏨 Hospedagem LGBT+' },
  { id: 'events', label: '🎉 Eventos VIP' },
];

// Base de Dados de Estabelecimentos e Destaques
const PLACES_DATA = [
  {
    id: '1',
    name: 'Zig Club',
    category: 'bars',
    typeTag: 'DICAS TRIP',
    membroFundador: true,
    destaque: true,
    rating: '4.9',
    address: 'Baixo Augusta, São Paulo - SP',
    desc: 'Pista pop, área externa aconchegante e coquetelaria exclusiva para a comunidade.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  },
  {
    id: '2',
    name: 'Castro Burger',
    category: 'gastro',
    typeTag: 'DICAS TRIP',
    membroFundador: true,
    destaque: true,
    rating: '4.8',
    address: 'Vila Mariana, São Paulo - SP',
    desc: 'Hamburgueria 100% LGBT+ friendly com ambiente inclusivo, drinks temáticos e espaço pet.',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
  },
  {
    id: '3',
    name: 'Café Floripa Inclusive',
    category: 'cafes',
    typeTag: 'DICAS TRIP',
    membroFundador: false,
    destaque: false,
    rating: '4.7',
    address: 'Centro Histórico, Florianópolis - SC',
    desc: 'Cafés especiais, brunch aos finais de semana e galeria de arte queer local.',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
  },
  {
    id: '4',
    name: 'Pousada Arco-Íris Mole',
    category: 'hotels',
    typeTag: 'DICAS TRIP',
    membroFundador: true,
    destaque: true,
    rating: '5.0',
    address: 'Praia da Mole, Florianópolis - SC',
    desc: 'Suítes beira-mar, atendimento humanizado e espaço exclusivo para casais LGBT+.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  },
  {
    id: '5',
    name: 'Festival Pride Night SP',
    category: 'events',
    typeTag: 'DICAS TRIP',
    membroFundador: false,
    destaque: true,
    rating: '4.9',
    address: 'Distrito Anhembi, São Paulo - SP',
    desc: 'O maior festival de música pop e eletrônica voltado para o público diversidade.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
  },
];

export default function TourismScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Estados dos Filtros
  const [activeHeaderTag, setActiveHeaderTag] = useState<'trip' | 'fundador' | 'destaques'>('trip');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtragem dinâmica
  const filteredPlaces = PLACES_DATA.filter((place) => {
    // Filtro do topo (Tags principais)
    if (activeHeaderTag === 'fundador' && !place.membroFundador) return false;
    if (activeHeaderTag === 'destaques' && !place.destaque) return false;

    // Filtro por Categoria (Bares, Gastronomia, etc)
    if (selectedCategory !== 'all' && place.category !== selectedCategory) return false;

    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* CABEÇALHO PADRONIZADO COM LOGO BADGE */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.logoBadge}>
            <Feather name="shield" size={14} color={COLORS.pink} />
            <Text style={styles.logoText}>LGBT+ APP</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* TOP TAGS SELETOR (Dicas Trip / Membro Fundador / Destaques) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topTagSelector}>
          <TouchableOpacity
            style={[styles.topTagItem, activeHeaderTag === 'trip' && styles.topTagItemActive]}
            onPress={() => setActiveHeaderTag('trip')}
          >
            <Text style={[styles.topTagText, activeHeaderTag === 'trip' && styles.topTagTextActive]}>
              ✈️ Dicas Trip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTagItem, activeHeaderTag === 'fundador' && styles.topTagItemActive]}
            onPress={() => setActiveHeaderTag('fundador')}
          >
            <Text style={[styles.topTagText, activeHeaderTag === 'fundador' && styles.topTagTextActive]}>
              👑 Membro Fundador
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTagItem, activeHeaderTag === 'destaques' && styles.topTagItemActive]}
            onPress={() => setActiveHeaderTag('destaques')}
          >
            <Text style={[styles.topTagText, activeHeaderTag === 'destaques' && styles.topTagTextActive]}>
              🔥 Destaques
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* SUB-CATEGORIAS (Bares, Gastronomia, Cafés, etc) */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* FEED DE CARDS FILTRADOS */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredPlaces.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="info" size={32} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Nenhum local encontrado para esses filtros.</Text>
          </View>
        ) : (
          filteredPlaces.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.85}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />

              <View style={styles.cardOverlay}>
                {/* TAGS DO ESTABELECIMENTO */}
                <View style={styles.tagRow}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>
                      {activeHeaderTag === 'fundador' ? 'MEMBRO FUNDADOR' : activeHeaderTag === 'destaques' ? 'DESTAQUE' : 'DICAS TRIP'}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Feather name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                </View>

                {/* TÍTULO E DETALHES */}
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={12} color={COLORS.pink} />
                  <Text style={styles.locationText}>{item.address}</Text>
                </View>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { padding: 8, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  logoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accentTag, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(225, 48, 108, 0.3)' },
  logoText: { color: COLORS.pink, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  
  // Tags superiores
  topTagSelector: { flexDirection: 'row', gap: 8 },
  topTagItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  topTagItemActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  topTagText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  topTagTextActive: { color: '#FFF' },

  // Filtro de categorias
  categoriesContainer: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoriesScroll: { paddingHorizontal: 16, gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { borderColor: COLORS.pink, backgroundColor: 'rgba(225, 48, 108, 0.1)' },
  categoryChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  categoryChipTextActive: { color: COLORS.pink, fontWeight: '700' },

  // Cards
  scrollContent: { padding: 16, gap: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImage: { width: '100%', height: 180 },
  cardOverlay: { padding: 14 },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tagBadge: { backgroundColor: COLORS.accentTag, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagBadgeText: { color: COLORS.pink, fontSize: 10, fontWeight: '800' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0B0B0E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  cardTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  cardDesc: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13 },
});