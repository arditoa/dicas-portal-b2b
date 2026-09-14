import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Image,
  ImageBackground,
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
  safeSpace: '#4CAF7D',
};

interface PremiumPartner {
  id: string;
  name: string;
  tagline: string;
  category: string;
  neighborhood: string;
  benefit: string;
  rating: string;
  image: string;
  isHero?: boolean;
}

export default function FeaturedScreen() {
  const router = useRouter();
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const pageTitle = tag ? decodeURIComponent(tag) : 'Membro Fundador';

  // Base Exclusiva com apenas 4-5 Parceiros VIP
  const partners: PremiumPartner[] = [
    {
      id: 'p1',
      name: 'Zig Club & Lounge',
      tagline: 'O ponto de encontro oficial da comunidade com pistas Pop e Drag Shows.',
      category: 'Vida Noturna & Festas',
      neighborhood: 'Baixo Augusta • São Paulo',
      benefit: 'Entrada VIP & Welcome Drink',
      rating: '4.9',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
      isHero: true,
    },
    {
      id: 'p2',
      name: 'Castro Burger',
      tagline: 'Hamburgueria 100% inclusiva com ambiente acolhedor e drinks temáticos.',
      category: 'Gastronomia',
      neighborhood: 'Vila Mariana • São Paulo',
      benefit: '10% OFF no cardápio principal',
      rating: '4.8',
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
    },
    {
      id: 'p3',
      name: 'Pousada Arco-Íris Mole',
      tagline: 'Suítes beira-mar e atendimento exclusivo para casais da comunidade.',
      category: 'Hospedagem LGBT+',
      neighborhood: 'Florianópolis • SC',
      benefit: 'Check-out tardio gratuito',
      rating: '5.0',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    },
    {
      id: 'p4',
      name: 'Café Aurora & Bistrô',
      tagline: 'Espaço cultural com brunch, galeria queer e cafés especiais.',
      category: 'Café & Cultura',
      neighborhood: 'Pinheiros • São Paulo',
      benefit: 'Café de cortesia no brunch',
      rating: '4.9',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    },
  ];

  const heroPartner = partners.find((p) => p.isHero);
  const regularPartners = partners.filter((p) => !p.isHero);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* HEADER: Botão Voltar + Logo Icon Real */}
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* CABEÇALHO VIP DA COTA */}
          <View style={styles.heroTitleArea}>
            <View style={styles.vipBadge}>
              <Feather name="award" size={12} color={COLORS.gold} />
              <Text style={styles.vipBadgeText}>SELEÇÃO EXCLUSIVA</Text>
            </View>
            <Text style={styles.mainTitle}>{pageTitle}</Text>
            <Text style={styles.subTitle}>
              Locais parceiros de excelência que apoiam e constroem nossa comunidade.
            </Text>
          </View>

          {/* 1º DESTAQUE: CARD HERO GRANDE (CAPA DE REVISTA) */}
          {heroPartner && (
            <TouchableOpacity
              style={styles.heroCard}
              onPress={() => router.push(`/business/${heroPartner.id}` as any)}
              activeOpacity={0.9}
            >
              <ImageBackground source={{ uri: heroPartner.image }} style={styles.heroImage} imageStyle={{ borderRadius: 20 }}>
                <View style={styles.heroGradient}>
                  <View style={styles.heroTopBadges}>
                    <View style={styles.masterTag}>
                      <Feather name="star" size={10} color="#000" />
                      <Text style={styles.masterTagText}>DESTAQUE MASTER</Text>
                    </View>
                    <View style={styles.ratingTag}>
                      <Feather name="star" size={10} color={COLORS.gold} />
                      <Text style={styles.ratingTagText}>{heroPartner.rating}</Text>
                    </View>
                  </View>

                  <View style={styles.heroBottomContent}>
                    <Text style={styles.heroCategory}>{heroPartner.category}</Text>
                    <Text style={styles.heroTitle}>{heroPartner.name}</Text>
                    <Text style={styles.heroTagline} numberOfLines={2}>{heroPartner.tagline}</Text>
                    
                    <View style={styles.benefitBox}>
                      <Feather name="gift" size={12} color={COLORS.gold} />
                      <Text style={styles.benefitText}>{heroPartner.benefit}</Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          )}

          {/* DEMAIS DESTAQUES MASTER (CARDS EM GRADE COM FOTO) */}
          <View style={styles.listSection}>
            <Text style={styles.sectionHeaderTitle}>Parceiros Selecionados</Text>

            {regularPartners.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.partnerCard}
                onPress={() => router.push(`/business/${item.id}` as any)}
                activeOpacity={0.88}
              >
                <Image source={{ uri: item.image }} style={styles.partnerThumb} />

                <View style={styles.partnerInfo}>
                  <View style={styles.partnerRowTop}>
                    <Text style={styles.partnerCategory}>{item.category}</Text>
                    <View style={styles.smallRating}>
                      <Feather name="star" size={10} color={COLORS.gold} />
                      <Text style={styles.smallRatingText}>{item.rating}</Text>
                    </View>
                  </View>

                  <Text style={styles.partnerTitle}>{item.name}</Text>
                  <Text style={styles.partnerLocation}>{item.neighborhood}</Text>

                  <View style={styles.partnerBenefitTag}>
                    <Feather name="check-circle" size={10} color={COLORS.safeSpace} />
                    <Text style={styles.partnerBenefitText}>{item.benefit}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA PARA NOVOS PARCEIROS */}
          <View style={styles.ctaCard}>
            <Feather name="shield" size={24} color={COLORS.purple} />
            <Text style={styles.ctaTitle}>Seja um {pageTitle}</Text>
            <Text style={styles.ctaSub}>
              Posicione sua marca em destaque máximo para milhares de pessoas na comunidade.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230', marginRight: 12 },
  headerIcon: { width: 36, height: 36 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Cabeçalho VIP
  heroTitleArea: { marginVertical: 14 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 213, 79, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 213, 79, 0.3)' },
  vipBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.gold, letterSpacing: 1 },
  mainTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subTitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },

  // Hero Card (1º Lugar)
  heroCard: { width: '100%', height: 320, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { flex: 1, backgroundColor: 'rgba(11, 11, 14, 0.55)', borderRadius: 20, padding: 16, justifyContent: 'space-between' },
  heroTopBadges: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  masterTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  masterTagText: { fontSize: 9, fontWeight: '900', color: '#000' },
  ratingTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0B0B0E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingTagText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  heroBottomContent: { gap: 4 },
  heroCategory: { fontSize: 11, fontWeight: '700', color: COLORS.pink, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  heroTagline: { fontSize: 12, color: '#D0D0E0', lineHeight: 17 },
  benefitBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(225, 48, 108, 0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  benefitText: { fontSize: 11, fontWeight: '700', color: COLORS.gold },

  // Lista dos Outros Parceiros
  listSection: { gap: 12, marginBottom: 24 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },

  partnerCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  partnerThumb: { width: 90, height: 90, borderRadius: 12 },
  partnerInfo: { flex: 1, justifyContent: 'space-between' },
  partnerRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partnerCategory: { fontSize: 10, fontWeight: '700', color: COLORS.pink },
  smallRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  smallRatingText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  partnerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  partnerLocation: { fontSize: 11, color: COLORS.textSecondary },
  partnerBenefitTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  partnerBenefitText: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace },

  // CTA Rodapé
  ctaCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: 'center', textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  ctaTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  ctaSub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
});