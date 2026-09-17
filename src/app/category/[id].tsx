import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIAS, CATEGORIA_REAL_LABEL, CategoriaSlugUI } from '../../lib/categorias';
import { useAuth } from '../../lib/authContext';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';

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

const PLANO_PRIORIDADE: Record<string, number> = { vip: 0, destaque: 1, basico: 2 };

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface LocalItem {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  bairro: string | null;
  cidade: string;
  foto_capa_url: string | null;
  safe_space: boolean;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  rating_media: number;
  rating_total: number;
  lat: number | null;
  lng: number | null;
}

export default function CategoryListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();

  const { id, title, search } = useLocalSearchParams<{ id: string; title?: string; search?: string }>();
  const slug = (id || '').toString().toLowerCase();
  const isTodos = slug === 'todos';

  const categoriaConfig = CATEGORIAS[slug as CategoriaSlugUI];
  const categoriaReal = isTodos ? null : categoriaConfig?.categoriaReal ?? slug;
  const decodedTitle = title
    ? decodeURIComponent(title)
    : categoriaConfig?.label || (categoriaReal ? CATEGORIA_REAL_LABEL[categoriaReal] : 'Todos os Locais');

  const [loading, setLoading] = useState(true);
  const [locais, setLocais] = useState<LocalItem[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [selectedSubcat, setSelectedSubcat] = useState(search ? 'Todas' : 'Em Alta');
  const [maxDistance, setMaxDistance] = useState(999);
  const [searchQuery, setSearchQuery] = useState(search ? decodeURIComponent(search) : '');

  const { coords, loading: loadingLocation, errorMsg: locationError } = useLocation(maxDistance !== 999);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('locais')
        .select(
          'id, nome, categoria, subcategoria, bairro, cidade, foto_capa_url, safe_space, plano_destaque, rating_media, rating_total, lat, lng'
        )
        .eq('status', 'aprovado')
        .limit(100);

      if (categoriaReal) query = query.eq('categoria', categoriaReal);

      const { data, error } = await query;
      if (error) throw error;

      const itens = ((data as any) || []) as LocalItem[];
      itens.sort((a, b) => (PLANO_PRIORIDADE[a.plano_destaque] ?? 2) - (PLANO_PRIORIDADE[b.plano_destaque] ?? 2));
      setLocais(itens);

      if (user?.id && itens.length > 0) {
        const { data: favs } = await supabase
          .from('favoritos_locais')
          .select('local_id')
          .eq('user_id', user.id)
          .in('local_id', itens.map((i) => i.id));
        setFavoritos((favs || []).map((f: any) => f.local_id));
      } else {
        setFavoritos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar categoria:', err);
      setLocais([]);
    } finally {
      setLoading(false);
    }
  }, [categoriaReal, user?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (locationError) {
      Alert.alert('Localização', 'Não conseguimos acessar sua localização. Mostrando todas as distâncias.');
      setMaxDistance(999);
    }
  }, [locationError]);

  const subcategoriasList = useMemo(() => {
    const reais = Array.from(
      new Set(locais.map((l) => l.subcategoria).filter((s): s is string => !!s && s.trim().length > 0))
    );
    return ['Em Alta', 'Todas', ...reais];
  }, [locais]);

  const handleToggleFavorito = async (localId: string) => {
    if (!session || !user) {
      Alert.alert(
        'Salvar nos Favoritos',
        'Crie sua conta ou entre em poucos segundos para guardar seus locais preferidos.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    const jaFavoritado = favoritos.includes(localId);
    try {
      if (jaFavoritado) {
        await supabase.from('favoritos_locais').delete().eq('local_id', localId).eq('user_id', user.id);
        setFavoritos(favoritos.filter((id) => id !== localId));
      } else {
        await supabase.from('favoritos_locais').insert({ local_id: localId, user_id: user.id });
        setFavoritos([...favoritos, localId]);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar seus favoritos.');
    }
  };

  const filteredPlaces = locais
    .map((item) => {
      const distanceKm =
        coords && item.lat != null && item.lng != null
          ? distanciaKm(coords.latitude, coords.longitude, item.lat, item.lng)
          : null;
      return { ...item, distanceKm };
    })
    .filter((item) => {
      const matchesSubcat =
        selectedSubcat === 'Em Alta'
          ? item.plano_destaque !== 'basico'
          : selectedSubcat === 'Todas' || item.subcategoria === selectedSubcat;

      const matchesDistance = maxDistance === 999 || item.distanceKm == null || item.distanceKm <= maxDistance;

      const matchesSearch =
        !searchQuery.trim() ||
        item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.bairro || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cidade.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSubcat && matchesDistance && matchesSearch;
    });

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
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

        {subcategoriasList.length > 1 && (
          <View style={styles.filterSection}>
            <FlatList
              horizontal
              data={subcategoriasList}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              renderItem={({ item }) => {
                const isSelected = selectedSubcat === item;
                const isEmAlta = item === 'Em Alta';
                return (
                  <TouchableOpacity
                    style={[styles.chip, isSelected && styles.chipActive, isEmAlta && !isSelected && styles.chipEmAltaInactive]}
                    onPress={() => setSelectedSubcat(item)}
                    activeOpacity={0.8}
                  >
                    {isEmAlta && (
                      <Feather name="trending-up" size={12} color={isSelected ? '#FFF' : COLORS.gold} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive, isEmAlta && !isSelected && { color: COLORS.gold }]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        <View style={styles.distanceSection}>
          <View style={styles.distanceLabelRow}>
            <Feather name="navigation" size={12} color={COLORS.pink} />
            <Text style={styles.distanceSectionTitle}>Raio de distância</Text>
            {loadingLocation && <ActivityIndicator size="small" color={COLORS.pink} style={{ marginLeft: 6 }} />}
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
                  <Text style={[styles.distChipText, isSelected && styles.distChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={COLORS.pink} />
          </View>
        ) : (
          <FlatList
            data={filteredPlaces}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="compass" size={32} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum local aprovado ainda</Text>
                <Text style={styles.emptySub}>
                  Novos locais aparecem aqui assim que forem aprovados pelo time.
                </Text>
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
                  <View style={styles.placeThumb}>
                    {item.foto_capa_url ? (
                      <Image source={{ uri: item.foto_capa_url }} style={styles.placeThumbImg} />
                    ) : (
                      <Feather name="map-pin" size={20} color={COLORS.pink} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.placeHeaderRow}>
                      <Text style={styles.placeName} numberOfLines={1}>{item.nome}</Text>
                      <View style={styles.actionRow}>
                        {item.plano_destaque !== 'basico' && (
                          <View style={styles.vipBadge}>
                            <Text style={styles.vipBadgeText}>DESTAQUE</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.favBtn}
                          onPress={() => handleToggleFavorito(item.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="heart" size={16} color={isFavorited ? COLORS.pink : COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.placeSubcat}>{item.subcategoria || CATEGORIA_REAL_LABEL[item.categoria] || item.categoria}</Text>
                    <Text style={styles.placeAddress}>{item.bairro || item.cidade}</Text>

                    <View style={styles.placeFooterRow}>
                      <Text style={styles.placeDistance}>
                        {item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : item.bairro || item.cidade}
                      </Text>
                      <View style={styles.ratingBadge}>
                        <Feather name="star" size={12} color={COLORS.gold} />
                        <Text style={styles.ratingText}>
                          {item.rating_total > 0 ? item.rating_media.toFixed(1) : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  headerBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerLogo: { width: 140, height: 34 },
  categoryTitleText: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },

  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, height: 42, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  filterSection: { marginBottom: 10 },
  chipsContainer: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  chipEmAltaInactive: { borderColor: 'rgba(255, 213, 79, 0.4)', backgroundColor: 'rgba(255, 213, 79, 0.08)' },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  distanceSection: { paddingHorizontal: 16, marginBottom: 12 },
  distanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  distanceSectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  distanceRow: { flexDirection: 'row', gap: 8 },
  distChip: { flex: 1, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  distChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  distChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  distChipTextActive: { color: '#FFF', fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 12 },
  emptyContainer: { alignItems: 'center', gap: 8, paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  placeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 12 },
  placeThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  placeThumbImg: { width: 48, height: 48 },
  placeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  placeName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vipBadge: { backgroundColor: 'rgba(225, 48, 108, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vipBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.pink },
  favBtn: { padding: 2 },
  placeSubcat: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  placeAddress: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  placeFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  placeDistance: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
