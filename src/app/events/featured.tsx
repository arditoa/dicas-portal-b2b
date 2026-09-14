import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

interface VIPEvent {
  id: string;
  title: string;
  tagline: string;
  date: string;
  location: string;
  benefit: string;
  rating: string;
  image: string;
  isHero?: boolean;
}

export default function FeaturedEventsScreen() {
  const router = useRouter();

  const events: VIPEvent[] = [
    {
      id: 'ev_hero',
      title: 'Castro Festival 2026',
      tagline: 'O maior festival inclusivo com 3 palcos, line-up pop/eletrônico e praça gastronômica.',
      date: 'HOJE • 22:00',
      location: 'Vale do Anhangabaú • São Paulo',
      benefit: 'Acesso à Área VIP & Drink de Boas-Vindas',
      rating: '5.0',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
      isHero: true,
    },
    {
      id: 'ev2',
      title: 'Drag Brunch & Performances',
      tagline: 'Performances ao vivo com as melhores queens da cena acompanhadas de brunch open bar.',
      date: 'HOJE • 14:00',
      location: 'Pinheiros • São Paulo',
      benefit: 'Mesa reservada na frente do palco',
      rating: '4.9',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    },
    {
      id: 'ev3',
      title: 'Sunset Sessions & Karaokê',
      tagline: 'Fim de tarde com coquetelaria artesanal, pista ao ar livre e vocal aberto.',
      date: 'HOJE • 18:00',
      location: 'Centro • São Paulo',
      benefit: 'Fila VIP na entrada',
      rating: '4.8',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    },
  ];

  const heroEvent = events.find((e) => e.isHero);
  const regularEvents = events.filter((e) => !e.isHero);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
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
          {/* TITULO */}
          <View style={styles.heroTitleArea}>
            <View style={styles.vipBadge}>
              <Feather name="calendar" size={12} color={COLORS.pink} />
              <Text style={styles.vipBadgeText}>AGENDA VIP HOJE</Text>
            </View>
            <Text style={styles.mainTitle}>Destaques de Hoje</Text>
            <Text style={styles.subTitle}>Eventos e festas parceiras com experiências e regalias exclusivas.</Text>
          </View>

          {/* HERO CARD */}
          {heroEvent && (
            <TouchableOpacity
              style={styles.heroCard}
              onPress={() => router.push(`/(tabs)/events` as any)}
              activeOpacity={0.9}
            >
              <ImageBackground source={{ uri: heroEvent.image }} style={styles.heroImage} imageStyle={{ borderRadius: 20 }}>
                <View style={styles.heroGradient}>
                  <View style={styles.heroTopBadges}>
                    <View style={styles.masterTag}>
                      <Feather name="zap" size={10} color="#000" />
                      <Text style={styles.masterTagText}>EVENTO MASTER</Text>
                    </View>
                    <View style={styles.ratingTag}>
                      <Feather name="clock" size={10} color={COLORS.pink} />
                      <Text style={styles.ratingTagText}>{heroEvent.date}</Text>
                    </View>
                  </View>

                  <View style={styles.heroBottomContent}>
                    <Text style={styles.heroCategory}>{heroEvent.location}</Text>
                    <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                    <Text style={styles.heroTagline} numberOfLines={2}>{heroEvent.tagline}</Text>
                    
                    <View style={styles.benefitBox}>
                      <Feather name="gift" size={12} color={COLORS.gold} />
                      <Text style={styles.benefitText}>{heroEvent.benefit}</Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          )}

          {/* LISTA OUTROS EVENTOS */}
          <View style={styles.listSection}>
            <Text style={styles.sectionHeaderTitle}>Outros Destaques de Hoje</Text>

            {regularEvents.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.partnerCard}
                onPress={() => router.push(`/(tabs)/events` as any)}
                activeOpacity={0.88}
              >
                <Image source={{ uri: item.image }} style={styles.partnerThumb} />

                <View style={styles.partnerInfo}>
                  <View style={styles.partnerRowTop}>
                    <Text style={styles.partnerCategory}>{item.date}</Text>
                    <View style={styles.smallRating}>
                      <Feather name="star" size={10} color={COLORS.gold} />
                      <Text style={styles.smallRatingText}>{item.rating}</Text>
                    </View>
                  </View>

                  <Text style={styles.partnerTitle}>{item.title}</Text>
                  <Text style={styles.partnerLocation}>{item.location}</Text>

                  <View style={styles.partnerBenefitTag}>
                    <Feather name="check-circle" size={10} color={COLORS.safeSpace} />
                    <Text style={styles.partnerBenefitText}>{item.benefit}</Text>
                  </View>
                </View>
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

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230', marginRight: 12 },
  headerIcon: { width: 36, height: 36 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  heroTitleArea: { marginVertical: 14 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(225, 48, 108, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(225, 48, 108, 0.3)' },
  vipBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.pink, letterSpacing: 1 },
  mainTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subTitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },

  heroCard: { width: '100%', height: 320, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { flex: 1, backgroundColor: 'rgba(11, 11, 14, 0.6)', borderRadius: 20, padding: 16, justifyContent: 'space-between' },
  heroTopBadges: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  masterTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.pink, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  masterTagText: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  ratingTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0B0B0E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingTagText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  heroBottomContent: { gap: 4 },
  heroCategory: { fontSize: 11, fontWeight: '700', color: COLORS.pink, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  heroTagline: { fontSize: 12, color: '#D0D0E0', lineHeight: 17 },
  benefitBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 213, 79, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  benefitText: { fontSize: 11, fontWeight: '700', color: COLORS.gold },

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
});