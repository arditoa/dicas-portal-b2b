import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

export interface CategoriaConfig {
  slug: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  subcats: string;
  emBreve?: boolean;
}

const CATEGORIES: Record<string, CategoriaConfig> = {
  bares: {
    slug: 'bares',
    label: 'Bares',
    icon: 'moon',
    color: '#E1306C',
    subcats: 'Pubs,Parklet,Rooftop,Cerveja 600ml,Speakeasy,Karaokê',
  },
  gastronomia: {
    slug: 'gastronomia',
    label: 'Gastronomia',
    icon: 'coffee',
    color: '#FFD54F',
    subcats: 'Bistrôs,Pizzarias,Cafés,Brunch,Hamburguerias',
  },
  festas: {
    slug: 'festas',
    label: 'Festas',
    icon: 'music',
    color: '#FFB74D',
    subcats: 'Pop,Eletrônico,Funk,Drag Shows',
  },
  cultura: {
    slug: 'cultura',
    label: 'Cultura',
    icon: 'film',
    color: '#4FC3F7',
    subcats: 'Teatros,Cinema,Exposições,Galerias',
  },
  turismo: {
    slug: 'turismo',
    label: 'Dicas Trip',
    icon: 'compass',
    color: '#81C784',
    subcats: 'Passagens Aéreas,Hotéis & Pousadas,Roteiros,Passeios,Guias',
  },
  beleza: {
    slug: 'beleza',
    label: 'Beleza',
    icon: 'scissors',
    color: '#E1306C',
    subcats: '',
    emBreve: true,
  },
  mais18: {
    slug: '18plus',
    label: 'Espaços 18+',
    icon: 'lock',
    color: '#7E57C2',
    subcats: '',
    emBreve: true,
  },
  lojas: {
    slug: 'lojas',
    label: 'Lojas',
    icon: 'shopping-bag',
    color: '#E1306C',
    subcats: '',
    emBreve: true,
  },
  servicos: {
    slug: 'servicos',
    label: 'Serviços',
    icon: 'briefcase',
    color: '#7E57C2',
    subcats: '',
    emBreve: true,
  },
  lazer: {
    slug: 'lazer',
    label: 'Lazer',
    icon: 'smile',
    color: '#4FC3F7',
    subcats: '',
    emBreve: true,
  },
};

const CATEGORY_ORDER = [
  'bares',
  'gastronomia',
  'festas',
  'cultura',
  'turismo',
  'beleza',
  'mais18',
  'lojas',
  'servicos',
  'lazer',
];

const EXPERIENCIAS = [
  'Aniversário',
  'Predominância lésbica',
  'Predominância Gay',
  'Date',
  'Rolê com amigos',
  'Dançar',
  'Música ao vivo',
  'Karaokê',
  'Drag show',
  'Comer bem',
  'Happy hour',
  'Cultura',
  'Relaxar',
  'Conhecer pessoas',
  'Aula de dança',
  'Aula de forró',
];

const BANNERS_PRINCIPAIS = [
  {
    id: 'b1',
    tag: 'MEMBRO FUNDADOR',
    titulo: 'Vezpa Bar & Zig Club',
    sub: 'Conheça os espaços que constroem nossa comunidade',
    cor: '#FFD54F',
    route: '/experience/Membro%20Fundador',
  },
  {
    id: 'b2',
    tag: 'DESTAQUE DA SEMANA',
    titulo: 'Barbearia Prisma & Café Aurora',
    sub: 'Experiências exclusivas e atendimento acolhedor',
    cor: '#E1306C',
    route: '/experience/Destaque',
  },
  {
    id: 'b3',
    tag: 'CUPONS EXCLUSIVOS',
    titulo: 'Economize nos seus Rolês',
    sub: 'Crie sua conta e garanta até 20% OFF nos parceiros',
    cor: '#7E57C2',
    route: '/(tabs)/profile',
  },
  {
    id: 'b4',
    tag: 'SEJA UM PARCEIRO',
    titulo: 'Cadastre seu Estabelecimento',
    sub: 'Divulgue seu espaço para a nossa comunidade',
    cor: '#4CAF7D',
    route: '/(tabs)/profile',
  },
];

// 🔥 5 LOCAIS EM ALTA COM INSTAGRAM E CORAÇÃO
const LOCAIS_EM_ALTA = [
  {
    id: 'vezpa-bar',
    name: 'Vezpa Bar & Speakeasy',
    category: 'Bar & Drinks',
    neighborhood: 'Pinheiros • SP',
    rating: '4.9',
    instagram: 'vezpabar',
    iconName: 'moon' as const,
  },
  {
    id: 'zig-club',
    name: 'Zig Club & Cabaré',
    category: 'Balada & Shows',
    neighborhood: 'Centro • SP',
    rating: '5.0',
    instagram: 'zigclub',
    iconName: 'music' as const,
  },
  {
    id: 'cafe-safica',
    name: 'Bar & Café Safica',
    category: 'Café & Pub',
    neighborhood: 'Consolação • SP',
    rating: '5.0',
    instagram: 'cafesafica',
    iconName: 'coffee' as const,
  },
  {
    id: 'pousada-castro',
    name: 'Hotel Boutique Castro',
    category: 'Hospedagem Friendly',
    neighborhood: 'Jardins • SP',
    rating: '4.9',
    instagram: 'pousadacastro',
    iconName: 'home' as const,
  },
  {
    id: 'barbearia-prisma',
    name: 'Barbearia & Estética Prisma',
    category: 'Beleza & Cuidados',
    neighborhood: 'Vila Madalena • SP',
    rating: '4.8',
    instagram: 'prismabarbearia',
    iconName: 'scissors' as const,
  },
];

const AGENDA_HOJE_MOCK = [
  {
    id: 'zig-club',
    horario: '22:00 • Centro',
    titulo: 'Sunset Sessions',
    diferencial: 'Karaokê & Drinks',
  },
  {
    id: 'castro-bar',
    horario: '23:30 • Pinheiros',
    titulo: 'Drag Cabaré Show',
    diferencial: 'Performance ao vivo',
  },
];

const DICAS_TRIP_DESTINOS = [
  {
    id: 'hotel-aurora',
    titulo: 'Hotel Aurora & Pousada',
    categoria: 'Hotéis & Pousadas',
    badge: '15% OFF',
    desc: 'Hospedagem inclusiva no coração de Pinheiros',
  },
  {
    id: 'voos-salvador',
    titulo: 'Roteiro Salvador LGBT+',
    categoria: 'Passagens & Roteiros',
    badge: 'PROMO TRIP',
    desc: 'Guia completo de praias e festas para o fim de semana',
  },
  {
    id: 'resort-floripa',
    titulo: 'Resort Safe Space Floripa',
    categoria: 'Destinos em Destaque',
    badge: 'PATROCINADO',
    desc: 'Experiência pé na areia com acolhimento total',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  // ESTADO DE AUTENTICAÇÃO
  const isUserLogged = false;

  const handleToggleFavorito = (placeId: string) => {
    if (!isUserLogged) {
      Alert.alert(
        'Salvar nos Favoritos',
        'Crie sua conta ou entre em poucos segundos para salvar seus locais favoritos.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    if (favoritos.includes(placeId)) {
      setFavoritos(favoritos.filter((id) => id !== placeId));
    } else {
      setFavoritos([...favoritos, placeId]);
    }
  };

  const handleOpenInstagram = (handle: string) => {
    Linking.openURL(`https://instagram.com/${handle}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    });
  };

  const handleCategoryPress = (cat: CategoriaConfig) => {
    if (cat.emBreve) return;

    if (cat.slug === 'festas') {
      router.push('/(tabs)/events');
      return;
    }

    router.push({
      pathname: `/category/${cat.slug}` as any,
      params: {
        title: encodeURIComponent(cat.label),
        subcats: encodeURIComponent(cat.subcats),
      },
    });
  };

  const openExperienceScreen = (exp: string) => {
    router.push({
      pathname: `/category/${encodeURIComponent(exp.toLowerCase())}` as any,
      params: {
        title: encodeURIComponent(exp),
        subcats: encodeURIComponent('Populares,Recomendados,Próximos'),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('../../assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />
          <Text style={styles.appSubtitulo}>Conexões e Experiências LGBT+</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Feather name="user" size={18} color="#D0D0E0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BUSCA */}
        <View style={styles.buscaContainer}>
          <Feather name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome, bairro ou local (ex: São Paulo)..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.buscaInput}
          />
        </View>

        {/* BANNERS PRINCIPAIS DIVERSIFICADOS */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.bannerScrollView}>
          {BANNERS_PRINCIPAIS.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.bannerCard}
              activeOpacity={0.85}
              onPress={() => router.push(b.route as any)}
            >
              <View style={[styles.bannerTag, { backgroundColor: b.cor }]}>
                <Text style={styles.bannerTagText}>{b.tag}</Text>
              </View>
              <Text style={styles.bannerTitle}>{b.titulo}</Text>
              <Text style={styles.bannerSub}>{b.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CATEGORIAS */}
        <View style={styles.secaoBloco}>
          <Text style={styles.sectionTituloPadrao}>Categorias</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriaScrollContent}>
            {CATEGORY_ORDER.map((slug) => {
              const cat = CATEGORIES[slug];
              return (
                <TouchableOpacity
                  key={slug}
                  style={styles.categoriaHorizontalItem}
                  onPress={() => handleCategoryPress(cat)}
                  activeOpacity={cat.emBreve ? 1 : 0.7}
                >
                  <View style={[styles.categoriaCircle, cat.emBreve && styles.categoriaDisabled]}>
                    <Feather name={cat.icon as any} size={22} color={cat.emBreve ? COLORS.purple : cat.color} />
                    {cat.emBreve && (
                      <View style={styles.emBreveBadge}>
                        <Text style={styles.emBreveTexto}>Em breve</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.categoriaLabel, cat.emBreve && { color: COLORS.textMuted }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 🚀 NOVA SEÇÃO: EM ALTA (5 LOCAIS COM INSTAGRAM E CORAÇÃO) */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="trending-up" size={16} color={COLORS.gold} />
              <Text style={styles.sectionTitulo}>Em Alta</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/category/todos?title=Em%20Alta' as any)}>
              <Text style={styles.sectionVerTudo}>Ver mais</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
            {LOCAIS_EM_ALTA.map((item) => {
              const isFavorited = favoritos.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.emAltaCard}
                  onPress={() => router.push(`/business/${item.id}` as any)}
                  activeOpacity={0.88}
                >
                  <View style={styles.emAltaHeaderRow}>
                    <View style={styles.emAltaCategoryBadge}>
                      <Text style={styles.emAltaCategoryText}>{item.category}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggleFavorito(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather
                        name="heart"
                        size={16}
                        color={isFavorited ? COLORS.pink : COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.emAltaTitle}>{item.name}</Text>
                  <Text style={styles.emAltaMeta}>{item.neighborhood} • ★ {item.rating}</Text>

                  <View style={styles.emAltaFooterRow}>
                    <TouchableOpacity
                      style={styles.instaBtn}
                      onPress={() => handleOpenInstagram(item.instagram)}
                      activeOpacity={0.8}
                    >
                      <Feather name="instagram" size={12} color={COLORS.pink} />
                      <Text style={styles.instaBtnText}>@{item.instagram}</Text>
                    </TouchableOpacity>
                    <Feather name="chevron-right" size={16} color={COLORS.safeSpace} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* O QUE FAZER HOJE */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitulo}>O que fazer hoje</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.sectionVerTudo}>Ver agenda</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
            {AGENDA_HOJE_MOCK.map((item) => {
              const isFavorited = favoritos.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.agendaCard}
                  onPress={() => router.push('/(tabs)/events')}
                  activeOpacity={0.85}
                >
                  <View style={styles.agendaImageArea}>
                    <Feather name="calendar" size={24} color={COLORS.pink} />
                    <TouchableOpacity
                      style={styles.favBtnFloating}
                      onPress={() => handleToggleFavorito(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather
                        name="heart"
                        size={16}
                        color={isFavorited ? COLORS.pink : '#FFF'}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.agendaContent}>
                    <Text style={styles.agendaHorario}>{item.horario}</Text>
                    <Text style={styles.agendaTitulo}>{item.titulo}</Text>
                    <Text style={styles.agendaDiferencial}>{item.diferencial}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* DICAS TRIP */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitulo}>Dicas Trip</Text>
              <Text style={styles.sectionSubtitulo}>Destinos, hospedagens e roteiros LGBT+</Text>
            </View>
            <TouchableOpacity onPress={() => handleCategoryPress(CATEGORIES.turismo)}>
              <Text style={styles.sectionVerTudo}>Ver catálogo</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
            {DICAS_TRIP_DESTINOS.map((item) => {
              const isFavorited = favoritos.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.turismoPropagandaCard}
                  onPress={() => router.push(`/business/${item.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.turismoHeaderRow}>
                    <Text style={styles.turismoCategoryBadge}>{item.categoria}</Text>
                    <View style={styles.cardHeaderRightRow}>
                      <View style={styles.turismoPromoBadge}>
                        <Text style={styles.turismoPromoText}>{item.badge}</Text>
                      </View>
                      <TouchableOpacity
                        style={{ marginLeft: 6 }}
                        onPress={() => handleToggleFavorito(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather
                          name="heart"
                          size={16}
                          color={isFavorited ? COLORS.pink : COLORS.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.turismoTitle}>{item.titulo}</Text>
                  <Text style={styles.turismoDesc} numberOfLines={2}>{item.desc}</Text>

                  <View style={styles.turismoFooterRow}>
                    <Text style={styles.turismoBtnText}>Ver detalhes do local</Text>
                    <Feather name="arrow-right" size={14} color={COLORS.safeSpace} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ESCOLHA PELA EXPERIÊNCIA */}
        <View style={styles.secaoBloco}>
          <Text style={styles.sectionTituloPadrao}>Escolha pela experiência</Text>
          <View style={styles.experienciasGrid}>
            {EXPERIENCIAS.map((exp) => (
              <TouchableOpacity
                key={exp}
                style={styles.expChip}
                onPress={() => openExperienceScreen(exp)}
                activeOpacity={0.8}
              >
                <Text style={styles.expChipText}>{exp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CARD CARNAVAL 2027 */}
        <View style={styles.carnavalCard}>
          <View style={styles.carnavalBadge}>
            <Text style={styles.carnavalBadgeText}>EM BREVE</Text>
          </View>
          <Text style={styles.carnavalTitle}>Carnaval LGBT+ 2027</Text>
          <Text style={styles.carnavalSub}>Guias, agenda de blocos e ativação oficial de notificações.</Text>
          <TouchableOpacity
            style={styles.carnavalBtn}
            onPress={() => Alert.alert('Notificações', 'Você receberá as novidades do Carnaval 2027!')}
          >
            <Text style={styles.carnavalBtnText}>Quero receber novidades</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerEsquerda: { justifyContent: 'center' },
  logoLinear: { width: 150, height: 36 },
  appSubtitulo: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, marginTop: 2 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buscaInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  bannerScrollView: { marginBottom: 24, paddingLeft: 16 },
  bannerCard: {
    width: 320,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  bannerTagText: { fontSize: 10, fontWeight: '800', color: '#000' },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary },

  secaoBloco: { marginBottom: 24 },
  sectionTituloPadrao: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 16, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitulo: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sectionSubtitulo: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionVerTudo: { fontSize: 12, fontWeight: '600', color: COLORS.pink },

  categoriaScrollContent: { paddingHorizontal: 16, gap: 12 },
  categoriaHorizontalItem: { alignItems: 'center', width: 84 },
  categoriaCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoriaDisabled: { opacity: 0.5 },
  emBreveBadge: { position: 'absolute', bottom: -4, backgroundColor: COLORS.purple, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  emBreveTexto: { fontSize: 6, fontWeight: '800', color: '#FFF' },
  categoriaLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },

  carrosselPadding: { paddingHorizontal: 16, gap: 12 },

  // Estilos da secao "Em Alta"
  emAltaCard: {
    width: 220,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    gap: 6,
  },
  emAltaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emAltaCategoryBadge: { backgroundColor: 'rgba(255, 213, 79, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emAltaCategoryText: { fontSize: 10, fontWeight: '800', color: COLORS.gold },
  emAltaTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  emAltaMeta: { fontSize: 11, color: COLORS.textSecondary },
  emAltaFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  instaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#232230', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  instaBtnText: { fontSize: 10, color: COLORS.textPrimary, fontWeight: '600' },

  agendaCard: { width: 170, borderRadius: 14, backgroundColor: COLORS.card, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  agendaImageArea: { height: 80, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  favBtnFloating: { position: 'absolute', top: 8, right: 8, padding: 4, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  agendaContent: { padding: 10 },
  agendaHorario: { fontSize: 11, fontWeight: '700', color: COLORS.pink, marginBottom: 2 },
  agendaTitulo: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  agendaDiferencial: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  turismoPropagandaCard: {
    width: 230,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    gap: 6,
  },
  turismoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderRightRow: { flexDirection: 'row', alignItems: 'center' },
  turismoCategoryBadge: { fontSize: 10, fontWeight: '700', color: COLORS.safeSpace },
  turismoPromoBadge: { backgroundColor: 'rgba(76, 175, 125, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  turismoPromoText: { fontSize: 9, fontWeight: '800', color: COLORS.safeSpace },
  turismoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  turismoDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },
  turismoFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  turismoBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace },

  experienciasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  expChip: { backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  expChipText: { fontSize: 12, fontWeight: '600', color: COLORS.purple },

  carnavalCard: { marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  carnavalBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(126, 87, 194, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  carnavalBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.purple },
  carnavalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  carnavalSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  carnavalBtn: { height: 40, backgroundColor: COLORS.purple, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  carnavalBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});