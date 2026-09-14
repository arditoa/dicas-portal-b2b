import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
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

const { width } = Dimensions.get('window');

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

// 1. TAXONOMIA DE CATEGORIAS (COM "EM BREVE")
const CATEGORIAS_MAPA = [
  { slug: 'bares', label: 'Bares', color: '#E1306C', emBreve: false },
  { slug: 'festas', label: 'Festas', color: '#FFB74D', emBreve: false },
  { slug: 'gastronomia', label: 'Gastronomia', color: '#FFD54F', emBreve: false },
  { slug: 'experiencia', label: 'Experiência', color: '#4FC3F7', emBreve: false },
  { slug: 'turismo', label: 'Turismo', color: '#81C784', emBreve: false },
  { slug: 'cultura', label: 'Cultura & Lazer', color: '#AED581', emBreve: false },
  { slug: 'servicos', label: 'Serviços', color: '#90CAF9', emBreve: true },
  { slug: 'lojas', label: 'Lojas', color: '#BA68C8', emBreve: true },
  { slug: 'beleza', label: 'Beleza', color: '#F06292', emBreve: true },
  { slug: 'mais18', label: '18+', color: '#7E57C2', emBreve: true },
];

// 2. NOVA TAXONOMIA DE PÚBLICO / ESTILO
const PUBLICO_FILTERS = [
  { slug: 'gay', label: 'Gay' },
  { slug: 'lesbica', label: 'Lésbica' },
  { slug: 'trans', label: 'Trans & NB' },
  { slug: 'drag', label: 'Drag Shows' },
  { slug: 'ursos', label: 'Bears & Ursos' },
  { slug: 'safe', label: 'Safe Space' },
];

// MOCK ATUALIZADO COM OS PÚBLICOS
const MOCK_LOCAIS = [
  {
    id: 'castro-bar',
    name: 'Castro Bar',
    categorySlug: 'bares',
    publico: ['gay', 'lesbica', 'safe'],
    desc: 'Bar & Petiscos · Consolação',
    rating: '4.9',
    dist: '1.2km',
    badge: 'Drink Duplo',
    latitude: -23.5558,
    longitude: -46.6580,
  },
  {
    id: 'cafe-amigas',
    name: 'Café das Amigas',
    categorySlug: 'gastronomia',
    publico: ['lesbica', 'trans', 'safe'],
    desc: 'Cafeteria e Brunch · Pinheiros',
    rating: '4.9',
    dist: '600m',
    badge: 'Safe Space',
    latitude: -23.5615,
    longitude: -46.6825,
  },
  {
    id: 'zig-club',
    name: 'Zig Club',
    categorySlug: 'festas',
    publico: ['gay', 'trans', 'drag', 'safe'],
    desc: 'Balada & Shows · Barra Funda',
    rating: '4.9',
    dist: '2.4km',
    badge: 'Membro Fundador',
    latitude: -23.5270,
    longitude: -46.6630,
  },
  {
    id: 'galeria-diversa',
    name: 'Galeria Diversa',
    categorySlug: 'cultura',
    publico: ['trans', 'lesbica', 'safe'],
    desc: 'Exposições & Arte · Vila Madalena',
    rating: '4.8',
    dist: '1.5km',
    badge: 'VIP',
    latitude: -23.5530,
    longitude: -46.6910,
  },
  {
    id: 'hotel-aurora',
    name: 'Hotel Aurora',
    categorySlug: 'turismo',
    publico: ['gay', 'lesbica', 'ursos', 'safe'],
    desc: 'Hotelaria · Pinheiros',
    rating: '4.8',
    dist: '900m',
    badge: 'Cupom 15%',
    latitude: -23.5670,
    longitude: -46.6780,
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  
  const [categoriasAtivas, setCategoriasAtivas] = useState<string[]>([]);
  const [publicosAtivos, setPublicosAtivos] = useState<string[]>([]);
  const [modalFiltrosVisivel, setModalFiltrosVisivel] = useState(false);

  // Lógica de Filtro Duplo
  const locaisFiltrados = useMemo(() => {
    return MOCK_LOCAIS.filter((local) => {
      const atendeCategoria = categoriasAtivas.length === 0 || categoriasAtivas.includes(local.categorySlug);
      const atendePublico = publicosAtivos.length === 0 || local.publico.some(p => publicosAtivos.includes(p));
      const atendeBusca = local.name.toLowerCase().includes(search.toLowerCase()) || 
                          local.desc.toLowerCase().includes(search.toLowerCase());
                          
      return atendeCategoria && atendePublico && atendeBusca;
    });
  }, [categoriasAtivas, publicosAtivos, search]);

  const handleToggleCategoria = (slug: string) => {
    setCategoriasAtivas(prev => prev.includes(slug) ? prev.filter(f => f !== slug) : [...prev, slug]);
  };

  const handleTogglePublico = (slug: string) => {
    setPublicosAtivos(prev => prev.includes(slug) ? prev.filter(f => f !== slug) : [...prev, slug]);
  };

  const limparFiltros = () => {
    setCategoriasAtivas([]);
    setPublicosAtivos([]);
  };

  const totalFiltros = categoriasAtivas.length + publicosAtivos.length;

  // Mostramos todas as categorias que NÃO são "Em breve" na legenda
  const categoriasExibidasLegenda = CATEGORIAS_MAPA.filter(c => !c.emBreve);

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

      {/* 2. BARRA DE BUSCA E BOTÃO DE FILTROS AGRUPADO */}
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
            {/* Renderizar chips ativos de CATEGORIA */}
            {categoriasAtivas.map((slug) => {
              const cat = CATEGORIAS_MAPA.find((c) => c.slug === slug);
              if (!cat) return null;
              return (
                <TouchableOpacity
                  key={`cat-${slug}`}
                  style={styles.chipFiltroAtivo}
                  onPress={() => handleToggleCategoria(slug)}
                >
                  <Text style={styles.chipFiltroAtivoText}>{cat.label}</Text>
                  <Feather name="x" size={14} color={COLORS.textPrimary} />
                </TouchableOpacity>
              );
            })}
            
            {/* Renderizar chips ativos de PÚBLICO */}
            {publicosAtivos.map((slug) => {
              const pub = PUBLICO_FILTERS.find((p) => p.slug === slug);
              if (!pub) return null;
              return (
                <TouchableOpacity
                  key={`pub-${slug}`}
                  style={[styles.chipFiltroAtivo, { backgroundColor: COLORS.purple }]}
                  onPress={() => handleTogglePublico(slug)}
                >
                  <Text style={styles.chipFiltroAtivoText}>{pub.label}</Text>
                  <Feather name="x" size={14} color={COLORS.textPrimary} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* 3. MAPA NATIVO */}
      <View style={styles.mapCardFrame}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: -23.5580,
            longitude: -46.6680,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          customMapStyle={darkMapStyle}
          showsUserLocation
          showsCompass={false}
        >
          {locaisFiltrados.map((local) => {
            const catColor = CATEGORIAS_MAPA.find(c => c.slug === local.categorySlug)?.color || COLORS.pink;
            return (
              <Marker
                key={local.id}
                coordinate={{ latitude: local.latitude, longitude: local.longitude }}
              >
                <View style={[styles.markerPin, { backgroundColor: catColor }]}>
                  <Feather name="map-pin" size={14} color="#FFF" />
                </View>
                <Callout tooltip onPress={() => router.push(`/business/${local.id}` as any)}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle}>{local.name}</Text>
                    <Text style={styles.calloutSub}>{local.desc}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      </View>

      {/* 4. LEGENDA INFERIOR CLEAN (AGORA COM TODAS ATIVAS) E CARROSSEL */}
      <View style={styles.bottomSection}>
        <View style={styles.legendaContainer}>
          <Text style={styles.legendaTitulo}>Legenda de cores</Text>
          <View style={styles.legendaRow}>
            {categoriasExibidasLegenda.map((cat) => (
              <View key={cat.slug} style={styles.legendaItem}>
                <View style={[styles.legendaBolinha, { backgroundColor: cat.color }]} />
                <Text style={styles.legendaTexto}>{cat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {locaisFiltrados.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum local encontrado com esses filtros</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
            {locaisFiltrados.map((item) => {
              const catColor = CATEGORIAS_MAPA.find(c => c.slug === item.categorySlug)?.color || COLORS.pink;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/business/${item.id}` as any)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rating}>★ {item.rating}</Text>
                  </View>
                  <Text style={styles.cardSub} numberOfLines={1}>{item.desc} · {item.dist}</Text>
                  <View style={[styles.badge, { backgroundColor: `${catColor}20`, borderColor: catColor }]}>
                    <Text style={[styles.badgeText, { color: catColor }]}>{item.badge}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* MODAL DE FILTROS DIVIDIDO (CATEGORIAS E PÚBLICO) */}
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
              
              {/* SESSÃO 1: PÚBLICO & PERFIL */}
              <Text style={styles.modalSectionTitle}>Público & Perfil</Text>
              <View style={styles.modalGrid}>
                {PUBLICO_FILTERS.map((pub) => {
                  const isSelected = publicosAtivos.includes(pub.slug);
                  return (
                    <TouchableOpacity
                      key={pub.slug}
                      style={[styles.modalChip, isSelected && { borderColor: COLORS.purple, backgroundColor: 'rgba(126, 87, 194, 0.15)' }]}
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

              {/* SESSÃO 2: CATEGORIAS */}
              <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Categorias do Local</Text>
              <View style={styles.modalGrid}>
                {CATEGORIAS_MAPA.map((cat) => {
                  const isSelected = categoriasAtivas.includes(cat.slug);
                  const isEmBreve = cat.emBreve;

                  return (
                    <TouchableOpacity
                      key={cat.slug}
                      style={[
                        styles.modalChip,
                        isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                        isEmBreve && { opacity: 0.4 } 
                      ]}
                      onPress={() => !isEmBreve && handleToggleCategoria(cat.slug)}
                      activeOpacity={isEmBreve ? 1 : 0.8}
                    >
                      <View style={[styles.modalBolinha, { backgroundColor: cat.color }]} />
                      <Text style={[styles.modalChipText, isSelected && { color: cat.color, fontWeight: '700' }]}>
                        {cat.label}
                      </Text>
                      {/* Selo Em breve */}
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
  logoLinear: { width: 140, height: 32 },
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

  mapCardFrame: { flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },

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
  emptyText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },

  // Estilos do Modal Aprimorado
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
    width: '48%', position: 'relative'
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