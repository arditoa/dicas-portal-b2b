import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HighlightBadge } from '../../components/HighlightBadge';
import { RatingBadge } from '../../components/RatingBadge';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';

const HIGHLIGHTED_VENUES = [
  {
    id: 'bar-exemplo-id',
    name: 'Vezpa Bar',
    neighborhood: 'Pinheiros',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
    deal: '20% OFF',
    rating: 5.0,
    reviewCount: 34,
  },
  {
    id: 'zig-club',
    name: 'Zig Club',
    neighborhood: 'Vila Madalena',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800',
    deal: 'VIP Pass',
    rating: 4.8,
    reviewCount: 86,
  },
];

const MAIN_VENUES = [
  {
    id: 'bar-da-gra',
    name: 'Bar da Gra',
    category: 'Bares',
    neighborhood: 'Pinheiros',
    distance: '450m',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
    deal: null,
    rating: 5.0,
    reviewCount: 18,
  },
  {
    id: 'castro-bar',
    name: 'Castro Bar',
    category: 'Bares',
    neighborhood: 'Consolação',
    distance: '1.2km',
    image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
    deal: 'Drink Duplo',
    rating: 4.9,
    reviewCount: 42,
  },
  {
    id: 'blue-space',
    name: 'Blue Space',
    category: 'Baladas',
    neighborhood: 'Barra Funda',
    distance: '3.5km',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800',
    deal: 'VIP até 23h',
    rating: 4.7,
    reviewCount: 215,
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header Card sem Engrenagem e Alinhado à Esquerda */}
      <View style={styles.headerCard}>
        <Image
          source={require('../../context/logo.jpg')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logoSubtitle}>
          O seu guia de experiências e espaços seguros
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Dicas da Semana */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dicas da Semana</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
          {HIGHLIGHTED_VENUES.map((venue) => (
            <TouchableOpacity
              key={venue.id}
              style={styles.squareCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/venue/${venue.id}`)}
            >
              <Image source={{ uri: venue.image }} style={styles.cardImage} />
              <View style={[styles.cardOverlay, { backgroundColor: 'rgba(21, 17, 28, 0.65)' }]} />
              
              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <HighlightBadge />
                </View>

                <View style={styles.venueInfoBottom}>
                  <Text style={styles.venueTitle} numberOfLines={1}>{venue.name}</Text>
                  
                  <View style={styles.iconTextRow}>
                    <Ionicons name="location-outline" size={12} color="#b6a6be" />
                    <Text style={styles.venueSub} numberOfLines={1}>{venue.neighborhood}</Text>
                  </View>
                  
                  <View style={styles.ratingContainer}>
                    <RatingBadge rating={venue.rating} reviewCount={venue.reviewCount} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Em Alta na Cidade */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Em Alta na Cidade</Text>
        </View>

        {MAIN_VENUES.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.horizontalCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/venue/${item.id}`)}
          >
            <Image source={{ uri: item.image }} style={styles.squareThumb} />

            <View style={styles.horizontalBody}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.listTitle} numberOfLines={1}>{item.name}</Text>
                <RatingBadge rating={item.rating} reviewCount={item.reviewCount} />
              </View>

              <Text style={styles.listSubtitle} numberOfLines={1}>
                {item.category.toUpperCase()} • {item.neighborhood} • {item.distance}
              </Text>

              {item.deal && (
                <View style={styles.dealTag}>
                  <Ionicons name="ticket-outline" size={12} color={COLORS.accent} />
                  <Text style={styles.dealText}>{item.deal}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Rodapé com Ícone PNG */}
        <View style={styles.footerContainer}>
          <View style={styles.footerLine} />
          <Image 
            source={require('../../context/logo-icon.png')} 
            style={styles.footerIcon} 
            resizeMode="contain"
          />
          <Text style={styles.footerText}>Feito com orgulho.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 40 },
  
  headerCard: {
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: RADIUS.card,
    alignItems: 'flex-start',
    
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  logoImage: {
    width: 200, // Logo ainda mais amplo e destacado
    height: 62,
    marginLeft: -16, // Encosta totalmente na borda esquerda útil da caixinha
  },
  logoSubtitle: {
    ...TYPOGRAPHY.bodyMetadata,
    color: '#a095a8',
    marginTop: 2,
    fontSize: 12,
  },

  scrollContent: { paddingBottom: 60 },
  
  sectionHeader: { paddingHorizontal: 20, marginBottom: 14, marginTop: 4 },
  sectionTitle: { ...TYPOGRAPHY.venueName, fontSize: 19 },
  
  carouselContainer: { paddingHorizontal: 20, gap: 14, marginBottom: 24 },
  squareCard: {
    width: 170,
    height: 170,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardContent: { flex: 1, padding: 14, justifyContent: 'space-between' },
  badgeRow: { alignItems: 'flex-start' },
  venueInfoBottom: { justifyContent: 'flex-end' },
  venueTitle: { ...TYPOGRAPHY.venueName, fontSize: 17, color: '#FFF', marginBottom: 4 },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  venueSub: { ...TYPOGRAPHY.captionTag, color: '#e0dce4', flex: 1 },
  ratingContainer: { alignSelf: 'flex-start' },

  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  squareThumb: {
    width: 86,
    height: 86,
    borderRadius: RADIUS.card - 4,
    backgroundColor: 'rgba(182, 166, 190, 0.15)',
  },
  horizontalBody: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  listTitle: { ...TYPOGRAPHY.venueName, fontSize: 16, flex: 1, marginRight: 8 },
  listSubtitle: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textSecondary, marginBottom: 10, fontSize: 12 },
  dealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 111, 160, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dealText: { ...TYPOGRAPHY.captionTag, color: COLORS.accent, fontWeight: 'bold' },

  footerContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  footerLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(182, 166, 190, 0.2)',
    marginBottom: 16,
    borderRadius: 1,
  },
  footerIcon: {
    width: 48,
    height: 48,
    opacity: 0.8,
    marginBottom: 8,
  },
  footerText: {
    ...TYPOGRAPHY.captionTag,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  }
});