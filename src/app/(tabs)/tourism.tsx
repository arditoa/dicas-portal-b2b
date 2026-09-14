import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  gold: '#FFD54F',
};

// 1. Filtros da Primeira Fileira (Categorias)
const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'trip', label: 'Dicas Trip' },
  { id: 'fundador', label: 'Membro Fundador' },
  { id: 'destaques', label: 'Destaques' },
  { id: 'pubs', label: 'Pubs & Bares' },
  { id: 'rooftops', label: 'Rooftops' },
];

// 2. Filtros da Segunda Fileira (Distâncias)
const DISTANCE_FILTERS = [
  { id: 'all_dist', label: 'Todas as distâncias', icon: 'compass' },
  { id: '1km', label: 'Até 1 km', icon: 'navigation' },
  { id: '5km', label: 'Até 5 km', icon: 'map-pin' },
];

interface PlaceItem {
  id: string;
  name: string;
  badgeTag: string;
  neighborhood: string;
  distance: string;
  isPatrocinado?: boolean;
  category: string;
}

export default function TourismScreen() {
  const router = useRouter();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('all_dist');

  // Dados Mockados seguindo o modelo da tela
  const places: PlaceItem[] = [
    {
      id: '1',
      name: 'Dicas Trip & Vida Noturna VIP',
      badgeTag: 'Destaque',
      neighborhood: 'Jardins',
      distance: '1.2 km',
      isPatrocinado: true,
      category: 'trip',
    },
    {
      id: '2',
      name: 'Espaço Membro Fundador Premium',
      badgeTag: 'Destaque',
      neighborhood: 'Pinheiros',
      distance: '2.5 km',
      isPatrocinado: true,
      category: 'fundador',
    },
    {
      id: '3',
      name: 'Local Acolhedor 1',
      badgeTag: 'Geral',
      neighborhood: 'Centro',
      distance: '3.0 km',
      isPatrocinado: false,
      category: 'destaques',
    },
    {
      id: '4',
      name: 'Local Acolhedor 2',
      badgeTag: 'Geral',
      neighborhood: 'Vila Madalena',
      distance: '4.8 km',
      isPatrocinado: false,
      category: 'pubs',
    },
  ];

  // Filtragem dinâmica
  const filteredPlaces = places.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    return true;
  });

  const patrocinados = filteredPlaces.filter((p) => p.isPatrocinado);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header com Botão de Voltar + Logo do App */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={require('../../assets/images/logo-icon.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
        </View>

        {/* Título Principal */}
        <View style={styles.titleArea}>
          <Text style={styles.mainTitle}>Dicas Trip & Destaques</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* FILEIRA 1: Chips de Categorias (Pílula Rosa quando ativo) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {CATEGORY_FILTERS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* FILEIRA 2: Chips de Distância (Pílula Roxa quando ativo) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRowDistance}>
            {DISTANCE_FILTERS.map((dist) => {
              const isSelected = selectedDistance === dist.id;
              return (
                <TouchableOpacity
                  key={dist.id}
                  style={[styles.distanceChip, isSelected && styles.distanceChipActive]}
                  onPress={() => setSelectedDistance(dist.id)}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={dist.icon as any}
                    size={13}
                    color={isSelected ? '#FFF' : COLORS.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.distanceChipText, isSelected && styles.distanceChipTextActive]}>
                    {dist.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* SEÇÃO EM ALTA / PATROCINADOS */}
          {patrocinados.length > 0 && (
            <View style={styles.emAltaSection}>
              <View style={styles.emAltaHeader}>
                <Feather name="trending-up" size={16} color={COLORS.gold} />
                <Text style={styles.emAltaTitle}>Em alta</Text>
              </View>

              <FlatList
                data={patrocinados}
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
                    <View style={styles.emAltaBadgeRow}>
                      <Feather name="star" size={10} color={COLORS.pink} />
                      <Text style={styles.emAltaBadgeText}>PATROCINADO</Text>
                    </View>
                    <Text style={styles.emAltaCardNome} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.emAltaCardSub}>
                      {item.neighborhood} • {item.distance}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* LISTA PRINCIPAL: Todos os Locais */}
          <View style={styles.mainListArea}>
            <Text style={styles.sectionTitle}>Todos os Locais</Text>

            {filteredPlaces.map((biz) => (
              <TouchableOpacity
                key={biz.id}
                style={styles.card}
                onPress={() => router.push(`/business/${biz.id}`)}
                activeOpacity={0.88}
              >
                <View style={styles.cardThumb} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{biz.name}</Text>
                  <Text style={styles.cardSubtext}>
                    {biz.badgeTag} • {biz.neighborhood} • {biz.distance}
                  </Text>
                </View>

                <Feather name="chevron-right" size={18} color="#606070" />
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  // Header superior
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230', marginRight: 12 },
  headerIcon: { width: 36, height: 36 },

  // Título
  titleArea: { paddingHorizontal: 16, marginVertical: 8 },
  mainTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },

  scrollContent: { paddingBottom: 40 },

  // Fileira 1: Categorias (Pílula Rosa)
  chipsRow: { paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  categoryChipTextActive: { color: '#FFF', fontWeight: '700' },

  // Fileira 2: Distâncias (Pílula Roxa)
  chipsRowDistance: { paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  distanceChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  distanceChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  distanceChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  distanceChipTextActive: { color: '#FFF', fontWeight: '700' },

  // Em Alta Section
  emAltaSection: { marginBottom: 24 },
  emAltaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  emAltaTitle: { fontSize: 16, fontWeight: '800', color: COLORS.gold },
  emAltaPadding: { paddingHorizontal: 16, gap: 12 },
  emAltaCard: { width: 220, height: 110, backgroundColor: COLORS.card, borderRadius: 18, padding: 14, justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border },
  emAltaBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emAltaBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.pink, letterSpacing: 0.5 },
  emAltaCardNome: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
  emAltaCardSub: { fontSize: 12, color: COLORS.textSecondary },

  // Todos os Locais Section
  mainListArea: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 10 },
  cardThumb: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#201E2E' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardSubtext: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});