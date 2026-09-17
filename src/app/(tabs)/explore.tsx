import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIAS, CATEGORIA_ORDER, CategoriaSlugUI } from '../../lib/categorias';
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
  gold: '#FFD54F',
};

// Cor de cada categoria REAL (public.categoria_tipo) derivada da mesma
// fonte usada em Home/Categorias/Turismo (src/lib/categorias.ts), pra não
// duplicar taxonomia — cada valor real do enum aponta pra 1 slug de UI e
// herda a cor dele.
const CATEGORIA_COR_POR_REAL: Record<string, string> = {};
Object.values(CATEGORIAS).forEach((c) => {
  if (c.categoriaReal) CATEGORIA_COR_POR_REAL[c.categoriaReal] = c.color;
});

// Categorias que de fato têm locais reais no mapa (as com categoriaReal
// definido). "Festas" fica de fora do filtro do mapa porque não é uma
// categoria de local — é a aba Eventos (os locais que sediam eventos já
// aparecem no mapa pela própria categoria real deles, ex.: um bar/clube
// aparece como "lugares").
const CATEGORIAS_COM_LOCAL_REAL = CATEGORIA_ORDER.filter((slug) => CATEGORIAS[slug].categoriaReal);
const CATEGORIAS_LEGENDA = CATEGORIAS_COM_LOCAL_REAL.filter((slug) => !CATEGORIAS[slug].emBreve);

// public.publico_tag real = ['todos','lesbica','gay','trans','bi','ursos'].
// "Safe Space" não é um publico_tag — é a coluna booleana `safe_space` de
// `locais` — por isso é tratado separadamente do array de tags reais.
const PUBLICO_FILTERS: { slug: 'gay' | 'lesbica' | 'trans' | 'bi' | 'ursos'; label: string }[] = [
  { slug: 'gay', label: 'Gay' },
  { slug: 'lesbica', label: 'Lésbica' },
  { slug: 'trans', label: 'Trans & NB' },
  { slug: 'bi', label: 'Bi' },
  { slug: 'ursos', label: 'Bears & Ursos' },
];
const SAFE_SPACE_FILTER_SLUG = 'safe_space';

interface LocalMapa {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  bairro: string | null;
  cidade: string;
  lat: number;
  lng: number;
  instagram: string | null;
  rating_media: number;
  rating_total: number;
  plano_destaque: string;
  safe_space: boolean;
  publico_tags: string[];
  local_badges: { rotulo: string; cor_tag: string; ativo: boolean }[] | null;
}

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function badgeDoLocal(local: LocalMapa): { texto: string; cor: string } | null {
  const badgeAtivo = local.local_badges?.find((b) => b.ativo);
  if (badgeAtivo) {
    const cor = badgeAtivo.cor_tag === 'dourado' ? COLORS.gold : badgeAtivo.cor_tag === 'rosa' ? COLORS.pink : '#81C784';
    return { texto: badgeAtivo.rotulo, cor };
  }
  if (local.plano_destaque === 'vip') return { texto: 'VIP', cor: COLORS.gold };
  if (local.plano_destaque === 'destaque') return { texto: 'Destaque', cor: COLORS.pink };
  if (local.safe_space) return { texto: 'Safe Space', cor: '#81C784' };
  return null;
}

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [locais, setLocais] = useState<LocalMapa[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoriasAtivas, setCategoriasAtivas] = useState<CategoriaSlugUI[]>([]);
  const [publicosAtivos, setPublicosAtivos] = useState<string[]>([]);
  const [pertoDeMim, setPertoDeMim] = useState(false);
  const [modalFiltrosVisivel, setModalFiltrosVisivel] = useState(false);

  const { coords } = useLocation(pertoDeMim);

  const carregarLocais = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('locais')
      .select(
        'id, nome, categoria, subcategoria, bairro, cidade, lat, lng, instagram, rating_media, rating_total, plano_destaque, safe_space, publico_tags, local_badges(rotulo, cor_tag, ativo)'
      )
      .eq('status', 'aprovado')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(200);

    if (error) {
      console.error('Erro ao carregar locais do mapa:', error.message);
      setLocais([]);
    } else {
      setLocais((data as any) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarLocais();
  }, [carregarLocais]);

  const locaisFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();

    const comDistancia = locais.map((local) => ({
      ...local,
      distanceKm:
        coords && local.lat != null && local.lng != null
          ? distanciaKm(coords.latitude, coords.longitude, local.lat, local.lng)
          : null,
    }));

    const filtrados = comDistancia.filter((local) => {
      const atendeCategoria =
        categoriasAtivas.length === 0 ||
        categoriasAtivas.some((slug) => CATEGORIAS[slug].categoriaReal === local.categoria);

      const atendePublico =
        publicosAtivos.length === 0 ||
        publicosAtivos.every((slug) =>
          slug === SAFE_SPACE_FILTER_SLUG ? local.safe_space : (local.publico_tags || []).includes(slug)
        );

      const atendeBusca =
        termo === '' ||
        local.nome.toLowerCase().includes(termo) ||
        (local.bairro || '').toLowerCase().includes(termo) ||
        local.cidade.toLowerCase().includes(termo);

      return atendeCategoria && atendePublico && atendeBusca;
    });

    if (pertoDeMim && coords) {
      filtrados.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    return filtrados;
  }, [locais, categoriasAtivas, publicosAtivos, search, pertoDeMim, coords]);

  const handleToggleCategoria = (slug: CategoriaSlugUI) => {
    if (CATEGORIAS[slug].emBreve) return;
    setCategoriasAtivas((prev) => (prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]));
  };

  const handleTogglePublico = (slug: string) => {
    setPublicosAtivos((prev) => (prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]));
  };

  const limparFiltros = () => {
    setCategoriasAtivas([]);
    setPublicosAtivos([]);
    setPertoDeMim(false);
  };

  const totalFiltros = categoriasAtivas.length + publicosAtivos.length + (pertoDeMim ? 1 : 0);

  const regiaoInicial = useMemo(() => {
    const comCoord = locais.find((l) => l.lat != null && l.lng != null);
    return {
      latitude: comCoord?.lat ?? -23.5558,
      longitude: comCoord?.lng ?? -46.6396,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [locais]);

  return (
    <View style={styles.container}>
      {/* 1. HEADER FIXO */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('../../assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />
          <Text style={styles.appSubtitulo}>Mapa Interativo · Espaços LGBT+</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Feather name="user" size={18} color="#D0D0E0" />
        </TouchableOpacity>
      </View>

      {/* 2. BARRA DE BUSCA E BOTÃO DE FILTROS */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome ou bairro..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtrosRow}>
          <TouchableOpacity
            style={styles.btnFiltroPrincipal}
            onPress={() => setModalFiltrosVisivel(true)}
            activeOpacity={0.8}
          >
            <Feather name="sliders" size={16} color={COLORS.textPrimary} />
            <Text style={styles.btnFiltroText}>Filtros</Text>
            {totalFiltros > 0 && (
              <View style={styles.badgeFiltro}>
                <Text style={styles.badgeFiltroText}>{totalFiltros}</Text>
              </View>
            )}
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.chipPertoDeMim, pertoDeMim && styles.chipPertoDeMimAtivo]}
              onPress={() => setPertoDeMim((v) => !v)}
            >
              <Feather name="navigation" size={12} color={pertoDeMim ? '#FFF' : COLORS.textSecondary} />
              <Text style={[styles.chipFiltroAtivoText, !pertoDeMim && { color: COLORS.textSecondary }]}>
                Perto de mim
              </Text>
            </TouchableOpacity>

            {categoriasAtivas.map((slug) => (
              <TouchableOpacity
                key={`cat-${slug}`}
                style={styles.chipFiltroAtivo}
                onPress={() => handleToggleCategoria(slug)}
              >
                <Text style={styles.chipFiltroAtivoText}>{CATEGORIAS[slug].label}</Text>
                <Feather name="x" size={14} color={COLORS.textPrimary} />
              </TouchableOpacity>
            ))}

            {publicosAtivos.map((slug) => {
              const label = slug === SAFE_SPACE_FILTER_SLUG ? 'Safe Space' : PUBLICO_FILTERS.find((p) => p.slug === slug)?.label;
              if (!label) return null;
              return (
                <TouchableOpacity
                  key={`pub-${slug}`}
                  style={[styles.chipFiltroAtivo, { backgroundColor: COLORS.purple }]}
                  onPress={() => handleTogglePublico(slug)}
                >
                  <Text style={styles.chipFiltroAtivoText}>{label}</Text>
                  <Feather name="x" size={14} color={COLORS.textPrimary} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* 3. MAPA NATIVO */}
      <View style={styles.mapCardFrame}>
        {loading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={COLORS.pink} />
          </View>
        ) : (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={regiaoInicial}
            customMapStyle={darkMapStyle}
            showsUserLocation
            showsCompass={false}
          >
            {locaisFiltrados.map((local) => {
              const catColor = CATEGORIA_COR_POR_REAL[local.categoria] || COLORS.pink;
              return (
                <Marker key={local.id} coordinate={{ latitude: local.lat, longitude: local.lng }}>
                  <View style={[styles.markerPin, { backgroundColor: catColor }]}>
                    <Feather name="map-pin" size={14} color="#FFF" />
                  </View>
                  <Callout tooltip onPress={() => router.push(`/business/${local.id}` as any)}>
                    <View style={styles.calloutCard}>
                      <Text style={styles.calloutTitle}>{local.nome}</Text>
                      <Text style={styles.calloutSub}>{local.bairro || local.cidade}</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>

      {/* 4. LEGENDA + CARROSSEL */}
      <View style={styles.bottomSection}>
        <View style={styles.legendaContainer}>
          <Text style={styles.legendaTitulo}>Legenda de cores</Text>
          <View style={styles.legendaRow}>
            {CATEGORIAS_LEGENDA.map((slug) => (
              <View key={slug} style={styles.legendaItem}>
                <View style={[styles.legendaBolinha, { backgroundColor: CATEGORIAS[slug].color }]} />
                <Text style={styles.legendaTexto}>{CATEGORIAS[slug].label}</Text>
              </View>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.pink} />
          </View>
        ) : locaisFiltrados.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {locais.length === 0
                ? 'Ainda não há locais aprovados no mapa.'
                : 'Nenhum local encontrado com esses filtros'}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
            {locaisFiltrados.map((item) => {
              const catColor = CATEGORIA_COR_POR_REAL[item.categoria] || COLORS.pink;
              const badge = badgeDoLocal(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/business/${item.id}` as any)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    {item.rating_total > 0 && <Text style={styles.rating}>★ {item.rating_media.toFixed(1)}</Text>}
                  </View>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {[item.bairro, item.distanceKm != null ? `${item.distanceKm.toFixed(1)}km` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {badge && (
                    <View style={[styles.badge, { backgroundColor: `${badge.cor}20`, borderColor: badge.cor }]}>
                      <Text style={[styles.badgeText, { color: badge.cor }]}>{badge.texto}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* MODAL DE FILTROS */}
      <Modal visible={modalFiltrosVisivel} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros do Mapa</Text>
              <TouchableOpacity onPress={() => setModalFiltrosVisivel(false)} hitSlop={10}>
                <Feather name="x" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalSectionTitle}>Público & Perfil</Text>
              <View style={styles.modalGrid}>
                <TouchableOpacity
                  style={[
                    styles.modalChip,
                    publicosAtivos.includes(SAFE_SPACE_FILTER_SLUG) && {
                      borderColor: COLORS.purple,
                      backgroundColor: 'rgba(126, 87, 194, 0.15)',
                    },
                  ]}
                  onPress={() => handleTogglePublico(SAFE_SPACE_FILTER_SLUG)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      publicosAtivos.includes(SAFE_SPACE_FILTER_SLUG) && { color: COLORS.purple, fontWeight: '700' },
                    ]}
                  >
                    Safe Space
                  </Text>
                </TouchableOpacity>
                {PUBLICO_FILTERS.map((pub) => {
                  const isSelected = publicosAtivos.includes(pub.slug);
                  return (
                    <TouchableOpacity
                      key={pub.slug}
                      style={[
                        styles.modalChip,
                        isSelected && { borderColor: COLORS.purple, backgroundColor: 'rgba(126, 87, 194, 0.15)' },
                      ]}
                      onPress={() => handleTogglePublico(pub.slug)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.modalChipText, isSelected && { color: COLORS.purple, fontWeight: '700' }]}>
                        {pub.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Categorias do Local</Text>
              <View style={styles.modalGrid}>
                {CATEGORIA_ORDER.map((slug) => {
                  const cat = CATEGORIAS[slug];
                  const isSelected = categoriasAtivas.includes(slug);
                  const isEmBreve = !!cat.emBreve;

                  return (
                    <TouchableOpacity
                      key={slug}
                      style={[
                        styles.modalChip,
                        isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                        isEmBreve && { opacity: 0.4 },
                      ]}
                      onPress={() => handleToggleCategoria(slug)}
                      activeOpacity={isEmBreve ? 1 : 0.8}
                    >
                      <View style={[styles.modalBolinha, { backgroundColor: cat.color }]} />
                      <Text style={[styles.modalChipText, isSelected && { color: cat.color, fontWeight: '700' }]}>
                        {cat.label}
                      </Text>
                      {isEmBreve && (
                        <View style={styles.badgeEmBreve}>
                          <Text style={styles.badgeEmBreveText}>Em breve</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.btnLimpar} onPress={limparFiltros}>
                <Text style={styles.btnLimparText}>Limpar Tudo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnAplicar} onPress={() => setModalFiltrosVisivel(false)}>
                <Text style={styles.btnAplicarText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#161520' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#161520' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232230' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B0B0E' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  headerEsquerda: { justifyContent: 'center' },
  logoLinear: { width: 140, height: 34 },
  appSubtitulo: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, marginTop: 2 },
  profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },

  controlsContainer: { gap: 12, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 14, height: 42, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  filtrosRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  btnFiltroPrincipal: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  btnFiltroText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  badgeFiltro: { backgroundColor: COLORS.pink, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  badgeFiltroText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  chipFiltroAtivo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.pink, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  chipFiltroAtivoText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  chipPertoDeMim: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  chipPertoDeMimAtivo: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },

  mapCardFrame: { flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.card },

  markerPin: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3 },
  calloutCard: { backgroundColor: COLORS.card, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, minWidth: 130 },
  calloutTitle: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  calloutSub: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },

  bottomSection: { marginBottom: 16, gap: 12 },
  legendaContainer: { paddingHorizontal: 16 },
  legendaTitulo: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  legendaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaBolinha: { width: 8, height: 8, borderRadius: 4 },
  legendaTexto: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '500' },

  cardsScroll: { paddingHorizontal: 16, gap: 12 },
  card: { width: 240, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  rating: { fontSize: 12, fontWeight: '700', color: '#FFD54F', marginLeft: 4 },
  cardSub: { fontSize: 11, color: COLORS.textSecondary },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  emptyCard: { marginHorizontal: 16, backgroundColor: COLORS.card, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  modalSectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 12 },

  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    width: '48%', position: 'relative',
  },
  modalBolinha: { width: 10, height: 10, borderRadius: 5 },
  modalChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  badgeEmBreve: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.purple, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeEmBreveText: { fontSize: 8, fontWeight: '800', color: '#FFF' },

  modalFooterActions: { flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  btnLimpar: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  btnLimparText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  btnAplicar: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.pink, alignItems: 'center' },
  btnAplicarText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
