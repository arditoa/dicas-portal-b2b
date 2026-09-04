import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { Coupon } from '../../types/database';
import { triggerImpact } from '../../utils/haptics';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const { venues, favorites, toggleFavorite, claimCoupon, claimedCoupons } = useApp();

  const venue = useMemo(() => venues.find((v) => v.id === id), [venues, id]);
  const isFav = favorites.includes(venue?.id || '');

  const availableCoupon = useMemo(() => {
    if (!venue?.isSponsored) return null;
    return {
      id: `cupom-${venue.id}`,
      title: 'Drink Duplo na Entrada',
      description: 'Apresente este cupom no caixa até as 23h para ganhar um drink duplo.',
      venueName: venue.name,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }, [venue]);

  // Proteção adicionada (?. e || false) para evitar que a tela quebre caso o array esteja vazio inicialmente
  const hasClaimedCoupon = claimedCoupons?.some((c: Coupon) => c.id === availableCoupon?.id) || false;

  if (!venue) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>Local não encontrado.</Text>
        <TouchableOpacity style={styles.backBtnFallback} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleToggleFav = async () => {
    triggerImpact('light');
    await toggleFavorite(venue.id);
  };

  const handleOpenMaps = () => {
    triggerImpact('light');
    const url = Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${venue.latitude},${venue.longitude}`
      : `https://maps.google.com/?q=${venue.latitude},${venue.longitude}`;
    Linking.openURL(url);
  };

  const handleOpenUber = () => {
    triggerImpact('light');
    const uberUrl = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${venue.latitude}&dropoff[longitude]=${venue.longitude}&dropoff[nickname]=${encodeURIComponent(venue.name)}`;
    Linking.openURL(uberUrl).catch(() => {
      Alert.alert('Uber', 'Não foi possível abrir o aplicativo da Uber.');
    });
  };

  const handleShare = async () => {
    triggerImpact('light');
    try {
      await Share.share({
        message: `Bora pro ${venue.name}? É um espaço ${venue.category} super legal em ${venue.city}! Veja no Dicas LGBT. 🌈`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleClaimCoupon = async () => {
    if (!availableCoupon) return;
    triggerImpact('medium');
    await claimCoupon(availableCoupon);
    Alert.alert('Cupom Resgatado!', 'Você pode acessá-lo na sua aba de Perfil > Meus Cupons.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HERO IMAGE */}
        <View style={styles.heroImageContainer}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="images-outline" size={48} color={theme.colors.border} />
            <Text style={styles.imagePlaceholderText}>Foto do Estabelecimento</Text>
          </View>
          
          <TouchableOpacity style={styles.absoluteBackBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.absoluteFavBtn} onPress={handleToggleFav}>
            <Ionicons name={isFav ? 'bookmark' : 'bookmark-outline'} size={22} color={isFav ? theme.colors.accent : theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          
          {/* HEADER INFO */}
          <View style={styles.headerInfo}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.venueMetaRow}>
              <Text style={styles.venueMetaText}>{venue.category.toUpperCase()} • {venue.neighborhood}, {venue.city}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={theme.colors.sponsor} />
                <Text style={styles.ratingText}>{venue.rating.toFixed(1)} ({venue.reviewCount})</Text>
              </View>
            </View>
          </View>

          {/* QUICK ACTIONS */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleOpenUber}>
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <Ionicons name="car" size={22} color={theme.colors.textPrimary} />
              </View>
              <Text style={styles.actionLabel}>Pedir Uber</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMaps}>
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
                <Ionicons name="map" size={22} color="#3498DB" />
              </View>
              <Text style={styles.actionLabel}>Rota</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(46, 204, 113, 0.15)' }]}>
                <Ionicons name="share-social" size={22} color="#2ECC71" />
              </View>
              <Text style={styles.actionLabel}>Compartilhar</Text>
            </TouchableOpacity>
          </View>

          {/* TAGS */}
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Público & Vibe</Text>
            <View style={styles.tagsGrid}>
              {venue.audienceTags.map((tag) => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                </View>
              ))}
              {venue.musicTags?.map((tag) => (
                <View key={tag} style={[styles.tagBadge, { borderColor: theme.colors.sponsor }]}>
                  <Text style={[styles.tagText, { color: theme.colors.sponsor }]}>♪ {tag.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* SAFE SPACE */}
          {venue.isSafeSpace && (
            <View style={styles.safeSpaceCard}>
              <View style={styles.safeSpaceHeader}>
                <Ionicons name="shield-checkmark" size={24} color={theme.colors.accent} />
                <Text style={styles.safeSpaceTitle}>Local Verificado: Safe Space</Text>
              </View>
              <Text style={styles.safeSpaceText}>
                Este estabelecimento assinou o termo de compromisso de tolerância zero contra preconceitos e possui equipe treinada para acolher a comunidade LGBTQIAPN+.
              </Text>
            </View>
          )}

          {/* CUPOM */}
          {availableCoupon && (
            <View style={styles.couponSection}>
              <View style={styles.couponHeader}>
                <Ionicons name="ticket" size={20} color={theme.colors.positive} />
                <Text style={styles.sectionTitle}>Benefício Exclusivo</Text>
              </View>
              
              <View style={styles.couponCard}>
                <View style={styles.couponContent}>
                  <Text style={styles.couponTitle}>{availableCoupon.title}</Text>
                  <Text style={styles.couponDesc}>{availableCoupon.description}</Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.claimBtn, hasClaimedCoupon && styles.claimedBtn]} 
                  onPress={handleClaimCoupon}
                  disabled={hasClaimedCoupon}
                >
                  <Text style={[styles.claimBtnText, hasClaimedCoupon && styles.claimedBtnText]}>
                    {hasClaimedCoupon ? 'Resgatado' : 'Resgatar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SOBRE */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>Sobre o Local</Text>
            <Text style={styles.aboutText}>
              {venue.description || 
              `O ${venue.name} é um dos locais mais movimentados da região de ${venue.neighborhood}. Perfeito para quem busca experiências autênticas, boa música e um ambiente totalmente acolhedor.`}
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 40 },
  heroImageContainer: { width: '100%', height: 260, backgroundColor: theme.colors.surface, position: 'relative' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 },
  imagePlaceholderText: { color: theme.colors.textSecondary, marginTop: 8, fontSize: 12, fontWeight: 'bold' },
  absoluteBackBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 10 : 20, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(24, 21, 36, 0.7)', justifyContent: 'center', alignItems: 'center' },
  absoluteFavBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 10 : 20, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(24, 21, 36, 0.7)', justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20, gap: 24 },
  headerInfo: { gap: 6 },
  venueName: { fontSize: 26, fontWeight: '900', color: theme.colors.textPrimary },
  venueMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueMetaText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textSecondary },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(224, 176, 100, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.sponsor },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8 },
  actionBtn: { alignItems: 'center', gap: 8 },
  actionIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary },
  tagsSection: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  tagText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textSecondary },
  safeSpaceCard: { backgroundColor: 'rgba(255, 111, 160, 0.1)', padding: 16, borderRadius: theme.borderRadius.card, borderWidth: 1, borderColor: 'rgba(255, 111, 160, 0.3)', gap: 8 },
  safeSpaceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  safeSpaceTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.accent },
  safeSpaceText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  couponSection: { gap: 12 },
  couponHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  couponCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 14, borderRadius: theme.borderRadius.card, borderWidth: 1, borderColor: theme.colors.positive, borderStyle: 'dashed' },
  couponContent: { flex: 1, paddingRight: 12, gap: 4 },
  couponTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.textPrimary },
  couponDesc: { fontSize: 12, color: theme.colors.textSecondary },
  claimBtn: { backgroundColor: theme.colors.positive, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.button },
  claimBtnText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.background },
  claimedBtn: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  claimedBtnText: { color: theme.colors.textSecondary },
  aboutSection: { gap: 8 },
  aboutText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
  backBtnFallback: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.button },
  backBtnText: { color: theme.colors.textPrimary, fontWeight: 'bold' },
});