import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  safeSpace: '#4CAF7D',
  gold: '#FFD54F',
};

const OPCOES_DISTANCIA = [
  { label: 'Qualquer distância', val: 999 },
  { label: 'Até 2 km', val: 2 },
  { label: 'Até 5 km', val: 5 },
];

const ESTABELECIMENTOS_MOCK = [
  {
    id: 't1',
    name: 'Passagens & Voos LGBT+ Friendly',
    categorySlug: 'turismo',
    subcat: 'Passagens Aéreas',
    iconName: 'send' as const,
    features: ['Milhas', 'Desconto Exclusivo', 'Parceiro Oficial'],
    address: 'Destinos Nacionais e Internacionais',
    distanceKm: 0,
    distanceStr: 'Voo Direto',
    isVIP: true,
    rating: '5.0',
    tags: ['predominância lésbica', 'predominância gay', 'aniversário'],
  },
  {
    id: 't2',
    name: 'Hotel Boutique Castro',
    categorySlug: 'turismo',
    subcat: 'Hotéis & Pousadas',
    iconName: 'home' as const,
    features: ['Pet Friendly', 'Piscina', 'Café Incluso'],
    address: 'Jardins • São Paulo, SP',
    distanceKm: 0,
    distanceStr: 'São Paulo',
    isVIP: true,
    rating: '4.9',
    tags: ['predominância gay', 'date', 'aniversário'],
  },
  {
    id: '1',
    name: 'Vezpa Bar & Speakeasy',
    categorySlug: 'bares',
    subcat: 'Speakeasy',
    iconName: 'map-pin' as const,
    features: ['Parklet', 'Speakeasy', 'Cerveja 600ml'],
    address: 'R. Lisboa, 400 • Pinheiros',
    distanceKm: 1.1,
    distanceStr: '1.1 km',
    isVIP: true,
    rating: '4.9',
    tags: ['predominância gay', 'happy hour', 'aniversário'],
  },
  {
    id: '2',
    name: 'Bar & Café Safica',
    categorySlug: 'bares',
    subcat: 'Pubs',
    iconName: 'map-pin' as const,
    features: ['Predominância Lésbica', 'Parklet', 'Cerveja 600ml'],
    address: 'R. Augusta, 1200 • Consolação',
    distanceKm: 1.8,
    distanceStr: '1.8 km',
    isVIP: false,
    rating: '5.0',
    tags: ['predominância lésbica', 'rolê com amigos', 'aniversário'],
  },
  {
    id: '3',
    name: 'Zig Club & Cabaré',
    categorySlug: 'bares',
    subcat: 'Pubs',
    iconName: 'map-pin' as const,
    features: ['Pubs', 'Karaokê', 'Cerveja 600ml'],
    address: 'R. Álvaro de Carvalho, 190 • Centro',
    distanceKm: 0.8,
    distanceStr: '0.8 km',
    isVIP: true,
    rating: '5.0',
    tags: ['predominância gay', 'dançar', 'aniversário'],
  },
];

export default function CategoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { id, title, subcats } = useLocalSearchParams<{
    id: string;
    title?: string;
    subcats?: string;
  }>();

  const slug = (id || '').toString().toLowerCase();
  const isTurismo = slug === 'turismo' || slug === 'dicas trip';
  const decodedTitle = title ? decodeURIComponent(title) : (slug ? slug.toUpperCase() : 'BUSCA');
  
  const rawSubcats = subcats ? decodeURIComponent(subcats).split(',') : [];
  const subcategoriesList = ['Em Alta', 'Todos', ...rawSubcats.filter((s) => s.trim().length > 0)];

  const [selectedSubcat, setSelectedSubcat] = useState('Em Alta');
  const [maxDistance, setMaxDistance] = useState(999);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  // SIMULAÇÃO DO STATUS DE LOGIN (SUBSTITUIR PELO HOOK/CONTEXTO DO SUPABASE DEPOIS)
  const isUserLogged = false; 

  const handleToggleFavorito = (placeId: string) => {
    if (!isUserLogged) {
      Alert.alert(
        'Salvar nos Favoritos',
        'Crie sua conta ou entre em 10 segundos para guardar seus locais preferidos.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    if (favoritos.includes(placeId)) {
      setFavoritos(favoritos.filter((favId) => favId !== placeId));
    } else {
      setFavoritos([...favoritos, placeId]);
    }
  };

  const filteredPlaces = ESTABELECIMENTOS_MOCK.filter((place) => {
    const matchesCategory =
      place.categorySlug.toLowerCase() === slug ||
      place.tags.some((t) => t.includes(slug)) ||
      slug === 'todos';

    const matchesSubcat =
      selectedSubcat === 'Em Alta'
        ? place.isVIP === true
        : selectedSubcat === 'Todos' ||
          place.subcat.toLowerCase() === selectedSubcat.toLowerCase() ||
          place.features.some((f) => f.toLowerCase() === selectedSubcat.toLowerCase());

    const matchesDistance = isTurismo || place.distanceKm <= maxDistance;

    const matchesSearch =
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.address.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSubcat && matchesDistance && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        
        {/* HEADER */}
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <Image
              source={require('../../assets/images/logolinear-semfundo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.categoryTitleText}>{decodedTitle}</Text>
        </View>

        {/* BUSCA DE TEXTO */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar em ${decodedTitle}...`}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* SUBCATEGORIAS */}
        {subcategoriesList.length > 1 && (
          <View style={styles.filterSection}>
            <FlatList
              horizontal
              data={subcategoriesList}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              renderItem={({ item }) => {
                const isSelected = selectedSubcat === item;
                const isEmAlta = item === 'Em Alta';

                return (
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      isSelected && styles.chipActive,
                      isEmAlta && !isSelected && styles.chipEmAltaInactive,
                    ]}
                    onPress={() => setSelectedSubcat(item)}
                    activeOpacity={0.8}
                  >
                    {isEmAlta && (
                      <Feather
                        name="trending-up"
                        size={12}
                        color={isSelected ? '#FFF' : COLORS.gold}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                        isEmAlta && !isSelected && { color: COLORS.gold },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* FILTRO DE DISTÂNCIA */}
        {!isTurismo && (
          <View style={styles.distanceSection}>
            <View style={styles.distanceLabelRow}>
              <Feather name="navigation" size={12} color={COLORS.pink} />
              <Text style={styles.distanceSectionTitle}>Raio de distância</Text>
            </View>
            <View style={styles.distanceRow}>
              {OPCOES_DISTANCIA.map((d) => {
                const isSelected = maxDistance === d.val;
                return (
                  <TouchableOpacity
                    key={d.val}
                    style={[styles.distChip, isSelected && styles.distChipActive]}
                    onPress={() => setMaxDistance(d.val)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.distChipText, isSelected && styles.distChipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* LISTA DE RESULTADOS */}
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="compass" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma opção encontrada</Text>
              <Text style={styles.emptySub}>Tente alterar os termos da sua busca.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isFavorited = favoritos.includes(item.id);

            return (
              <TouchableOpacity
                style={styles.placeCard}
                onPress={() => router.push(`/business/${item.id}` as any)}
                activeOpacity={0.88}
              >
                <View style={[styles.placeThumb, isTurismo && { backgroundColor: 'rgba(76, 175, 125, 0.15)' }]}>
                  <Feather
                    name={item.iconName}
                    size={20}
                    color={isTurismo ? COLORS.safeSpace : COLORS.pink}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.placeHeaderRow}>
                    <Text style={styles.placeName}>{item.name}</Text>

                    {/* ÁREA DE ÍCONES DE AÇÃO (DESTAQUE E CORAÇÃO DE FAVORITO) */}
                    <View style={styles.actionRow}>
                      {item.isVIP && (
                        <View style={styles.vipBadge}>
                          <Text style={styles.vipBadgeText}>DESTAQUE</Text>
                        </View>
                      )}
                      
                      {/* BOTÃO CORAÇÃO / FAVORITAR */}
                      <TouchableOpacity
                        style={styles.favBtn}
                        onPress={() => handleToggleFavorito(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather
                          name="heart"
                          size={16}
                          color={isFavorited ? COLORS.pink : COLORS.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.placeSubcat}>{item.subcat}</Text>
                  <Text style={styles.placeAddress}>{item.address}</Text>

                  <View style={styles.tagList}>
                    {item.features.map((tag) => (
                      <View key={tag} style={styles.featureTag}>
                        <Text style={styles.featureTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.placeFooterRow}>
                    <Text style={[styles.placeDistance, isTurismo && { color: COLORS.safeSpace }]}>
                      {item.distanceStr}
                    </Text>
                    <View style={styles.ratingBadge}>
                      <Feather name="star" size={12} color={COLORS.gold} />
                      <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                  </View>
                </View>

                <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            );
          }}
        />

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  headerBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerLogo: { width: 130, height: 32 },
  categoryTitleText: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  filterSection: { marginBottom: 10 },
  chipsContainer: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  chipEmAltaInactive: {
    borderColor: 'rgba(255, 213, 79, 0.4)',
    backgroundColor: 'rgba(255, 213, 79, 0.08)',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  distanceSection: { paddingHorizontal: 16, marginBottom: 12 },
  distanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  distanceSectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  distanceRow: { flexDirection: 'row', gap: 8 },
  distChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  distChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  distChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  distChipTextActive: { color: '#FFF', fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 12 },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  placeThumb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(225, 48, 108, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  placeName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  favBtn: { padding: 4 },
  vipBadge: { backgroundColor: 'rgba(255, 213, 79, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vipBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.gold },
  placeSubcat: { fontSize: 11, fontWeight: '700', color: COLORS.purple, marginTop: 2 },
  placeAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  featureTag: { backgroundColor: '#232230', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  featureTagText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },

  placeFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  placeDistance: { fontSize: 11, fontWeight: '700', color: COLORS.pink },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
});