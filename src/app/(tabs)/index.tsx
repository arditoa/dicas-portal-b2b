import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
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

export interface CategoriaConfig {
  slug: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  emBreve?: boolean;
}

const CATEGORIES: Record<string, CategoriaConfig> = {
  bares: { slug: 'bares', label: 'Bares', icon: 'moon', color: '#E1306C' },
  gastronomia: { slug: 'gastronomia', label: 'Gastronomia', icon: 'coffee', color: '#FFD54F' },
  festas: { slug: 'festas', label: 'Festas', icon: 'music', color: '#FFB74D' },
  cultura: { slug: 'cultura', label: 'Cultura', icon: 'film', color: '#4FC3F7' },
  turismo: { slug: 'tourism', label: 'Dicas Trip', icon: 'compass', color: '#81C784' },
  beleza: { slug: 'beleza', label: 'Beleza', icon: 'scissors', color: '#E1306C', emBreve: true },
  mais18: { slug: '18plus', label: 'Espaços 18+', icon: 'lock', color: '#7E57C2', emBreve: true },
  lojas: { slug: 'lojas', label: 'Lojas', icon: 'shopping-bag', color: '#E1306C', emBreve: true },
  servicos: { slug: 'servicos', label: 'Serviços', icon: 'briefcase', color: '#7E57C2', emBreve: true },
  lazer: { slug: 'lazer', label: 'Lazer', icon: 'smile', color: '#4FC3F7', emBreve: true },
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
  'Date', 'Rolê com amigos', 'Dançar', 'Música ao vivo',
  'Karaokê', 'Drag show', 'Comer bem', 'Happy hour',
  'Cultura', 'Relaxar', 'Conhecer pessoas', 'Passear',
  'Aniversário', 'Aula de dança', 'Aula de forró'
];

const BANNERS_PRINCIPAIS = [
  { id: 'b1', tag: 'DICAS TRIP', titulo: 'Destinos e Roteiros LGBT+', sub: 'Apresentação Oficial na Conferência de Turismo', cor: '#81C784' },
  { id: 'b2', tag: 'MEMBRO FUNDADOR', titulo: 'Vezpa Bar & Zig Club', sub: 'Conheça os espaços que constroem nossa comunidade', cor: '#FFD54F' },
  { id: 'b3', tag: 'PATROCINADO', titulo: 'Barbearia Prisma & Café Aurora', sub: 'Experiências exclusivas e atendimento acolhedor', cor: '#E1306C' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');

  const handleCategoryPress = (cat: CategoriaConfig) => {
    if (cat.emBreve) return;
    router.push(`/business/${cat.slug}`);
  };

  return (
    <View style={styles.container}>
      {/* Header com Logo Linear */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('@/assets/images/logolinear-semfundo.png')}
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
        
        {/* Busca e Localização */}
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

        {/* 02. Banner Principal (Carrossel Único) */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.bannerScrollView}>
          {BANNERS_PRINCIPAIS.map((b) => (
            <View key={b.id} style={styles.bannerCard}>
              <View style={[styles.bannerTag, { backgroundColor: b.cor }]}>
                <Text style={styles.bannerTagText}>{b.tag}</Text>
              </View>
              <Text style={styles.bannerTitle}>{b.titulo}</Text>
              <Text style={styles.bannerSub}>{b.sub}</Text>
            </View>
          ))}
        </ScrollView>

        {/* 03. Categorias (Carrossel Horizontal Sem Cortar Nomes) */}
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

        {/* 04. O que fazer hoje */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitulo}>O que fazer hoje</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.sectionVerTudo}>Ver tudo</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
            <TouchableOpacity style={styles.agendaCard} onPress={() => router.push('/(tabs)/events')}>
              <View style={styles.agendaImageArea}><Feather name="calendar" size={24} color={COLORS.textMuted} /></View>
              <View style={styles.agendaContent}>
                <Text style={styles.agendaHorario}>22:00 • Centro</Text>
                <Text style={styles.agendaTitulo}>Sunset Sessions</Text>
                <Text style={styles.agendaDiferencial}>Karaokê & Drinks</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.agendaCard} onPress={() => router.push('/(tabs)/events')}>
              <View style={styles.agendaImageArea}><Feather name="calendar" size={24} color={COLORS.textMuted} /></View>
              <View style={styles.agendaContent}>
                <Text style={styles.agendaHorario}>23:30 • Pinheiros</Text>
                <Text style={styles.agendaTitulo}>Drag Cabaré Show</Text>
                <Text style={styles.agendaDiferencial}>Performance ao vivo</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 05. Dicas Trip em Destaque */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitulo}>Dicas Trip</Text>
              <Text style={styles.sectionSubtitulo}>Destinos, hospedagens e roteiros LGBT+</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/business/tourism')}>
              <Text style={styles.sectionVerTudo}>Explorar Turismo</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
            <TouchableOpacity style={styles.turismoCard} onPress={() => router.push('/business/tourism')}>
              <Feather name="map-pin" size={18} color={COLORS.safeSpace} />
              <Text style={styles.turismoTitulo}>Destinos em Destaque</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.turismoCard} onPress={() => router.push('/business/tourism')}>
              <Feather name="home" size={18} color={COLORS.safeSpace} />
              <Text style={styles.turismoTitulo}>Onde se Hospedar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.turismoCard} onPress={() => router.push('/business/tourism')}>
              <Feather name="compass" size={18} color={COLORS.safeSpace} />
              <Text style={styles.turismoTitulo}>Roteiros Recomendados</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 07. Escolha pela experiência (Direcionando para /experience/[tag]) */}
        <View style={styles.secaoBloco}>
          <Text style={styles.sectionTituloPadrao}>Escolha pela experiência</Text>
          <View style={styles.experienciasGrid}>
            {EXPERIENCIAS.map((exp) => (
              <TouchableOpacity
                key={exp}
                style={styles.expChip}
                onPress={() => router.push(`/experience/${encodeURIComponent(exp)}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.expChipText}>{exp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 08. Carnaval LGBT+ 2027 */}
        <View style={styles.carnavalCard}>
          <View style={styles.carnavalBadge}><Text style={styles.carnavalBadgeText}>EM BREVE</Text></View>
          <Text style={styles.carnavalTitle}>Carnaval LGBT+ 2027</Text>
          <Text style={styles.carnavalSub}>Guias, agenda de blocos e ativação oficial de notificações.</Text>
          <TouchableOpacity style={styles.carnavalBtn} onPress={() => Alert.alert('Notificações', 'Você receberá as novidades do Carnaval 2027!')}>
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

  buscaContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 14, height: 44, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  buscaInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  bannerScrollView: { marginBottom: 24, paddingLeft: 16 },
  bannerCard: { width: 320, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1, borderColor: COLORS.border },
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
  categoriaCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: COLORS.border },
  categoriaDisabled: { opacity: 0.5 },
  emBreveBadge: { position: 'absolute', bottom: -4, backgroundColor: COLORS.purple, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  emBreveTexto: { fontSize: 6, fontWeight: '800', color: '#FFF' },
  categoriaLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },

  carrosselPadding: { paddingHorizontal: 16, gap: 12 },
  agendaCard: { width: 170, borderRadius: 14, backgroundColor: COLORS.card, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  agendaImageArea: { height: 80, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center' },
  agendaContent: { padding: 10 },
  agendaHorario: { fontSize: 11, fontWeight: '700', color: COLORS.pink, marginBottom: 2 },
  agendaTitulo: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  agendaDiferencial: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  turismoCard: { width: 130, height: 95, borderRadius: 14, backgroundColor: COLORS.card, padding: 12, justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border },
  turismoTitulo: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },

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