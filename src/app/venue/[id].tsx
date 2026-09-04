import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { HighlightBadge } from '../../components/HighlightBadge';
import { RatingBadge } from '../../components/RatingBadge';
import { COLORS, LAYOUT, RADIUS, TYPOGRAPHY } from '../../constants/theme';

// Helper inline para evitar dependências de arquivos de serviço externos
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (__DEV__) {
    console.log(`[ANALYTICS EVENT] ${eventName}:`, params ?? {});
  }
};

const MOCK_VENUE_DETAILS = {
  id: 'bar-exemplo-id',
  name: 'Vezpa Bar',
  category: 'BAR',
  neighborhood: 'Pinheiros',
  address: 'Rua dos Pinheiros, 450 - Pinheiros, São Paulo - SP',
  image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
  rating: 5.0,
  reviewCount: 34,
  isSafeSpace: true,
  isHighlight: true,
  description:
    'Espaço acolhedor no coração de Pinheiros. Drinks autorais, ambiente seguro para a comunidade LGBT+ e programação cultural aos finais de semana.',
  instagram: '@vezpabar',
  deal: {
    id: 'cupom-1',
    title: '20% OFF em Drinks Selecionados',
    rules: 'Válido de terça a quinta-feira mediante apresentação do código no caixa.',
  },
};

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);

  const venue = MOCK_VENUE_DETAILS;

  const handleOpenRoute = () => {
    trackEvent('view_route', { venue_id: id });
    const query = encodeURIComponent(`${venue.name}, ${venue.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const handleOpenInstagram = () => {
    const username = venue.instagram.replace('@', '');
    Linking.openURL(`https://instagram.com/${username}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Confira o ${venue.name} no app Dicas LGBT! 📍 ${venue.neighborhood}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRedeemCoupon = () => {
    trackEvent('redeem_coupon', { venue_id: id });
    Alert.alert(
      'Cupom Resgatado! 🎟️',
      `Apresente o código MAMI20 no caixa para obter: ${venue.deal.title}`,
      [
        {
          text: 'Ver na Carteira',
          onPress: () => router.push('/rewards'),
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Superior com Imagem e Ações */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: venue.image }} style={styles.image} />
          <View style={styles.imageOverlay} />

          {/* Header Flutuante */}
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.iconCircle} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconCircle}
                onPress={() => {
                  setIsSaved(!isSaved);
                  trackEvent('favorite_venue', { venue_id: id, saved: !isSaved });
                }}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isSaved ? COLORS.accent : '#FFF'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Informações Principais */}
        <View style={styles.body}>
          <View style={styles.badgeRow}>
            {venue.isHighlight && <HighlightBadge />}
            {venue.isSafeSpace && (
              <View style={styles.safeSpaceBadge}>
                <Text style={styles.safeSpaceText}>🛡️ Safe Space</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{venue.name}</Text>

          <View style={styles.metaRow}>
            <Text style={TYPOGRAPHY.bodyMetadata}>
              {venue.category} • {venue.neighborhood}
            </Text>
            <RatingBadge rating={venue.rating} reviewCount={venue.reviewCount} />
          </View>

          <Text style={styles.description}>{venue.description}</Text>

          {/* Card de Benefício / Cupom */}
          {venue.deal && (
            <View style={styles.dealCard}>
              <View style={styles.dealHeader}>
                <Text style={styles.dealBadge}>🎟️ OFERTA EXCLUSIVA</Text>
              </View>
              <Text style={styles.dealTitle}>{venue.deal.title}</Text>
              <Text style={styles.dealRules}>{venue.deal.rules}</Text>
              <TouchableOpacity
                style={styles.btnRedeem}
                onPress={handleRedeemCoupon}
                activeOpacity={0.85}
              >
                <Text style={styles.btnRedeemText}>Resgatar Cupom</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Seção de Endereço e Contato */}
          <Text style={styles.sectionTitle}>LOCALIZAÇÃO & CONTATO</Text>
          <View style={styles.infoBox}>
            <TouchableOpacity style={styles.infoRow} onPress={handleOpenRoute}>
              <Ionicons name="location-outline" size={20} color={COLORS.accent} />
              <Text style={styles.infoText}>{venue.address}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.infoRow} onPress={handleOpenInstagram}>
              <Ionicons name="logo-instagram" size={20} color={COLORS.accent} />
              <Text style={styles.infoText}>{venue.instagram}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Botão Fixo Inferior de Rota */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.btnRoute} onPress={handleOpenRoute} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnRouteText}>Como Chegar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },
  imageContainer: { width: '100%', height: 260, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21, 17, 28, 0.4)' },
  headerBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRightActions: { flexDirection: 'row', gap: 10 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 23, 38, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { padding: 20 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  safeSpaceBadge: {
    backgroundColor: 'rgba(146, 192, 155, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  safeSpaceText: { ...TYPOGRAPHY.captionTag, color: COLORS.positive, fontWeight: 'bold' },
  title: { ...TYPOGRAPHY.screenTitle, fontSize: 26, marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  description: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textPrimary, lineHeight: 22, marginBottom: 24 },
  dealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 160, 0.3)',
    marginBottom: 24,
  },
  dealHeader: { marginBottom: 8 },
  dealBadge: { ...TYPOGRAPHY.captionTag, color: COLORS.accent, fontWeight: 'bold' },
  dealTitle: { ...TYPOGRAPHY.venueName, fontSize: 17, marginBottom: 4 },
  dealRules: { ...TYPOGRAPHY.captionTag, color: COLORS.textSecondary, marginBottom: 16 },
  btnRedeem: {
    backgroundColor: COLORS.accent,
    height: LAYOUT.minTouchTarget,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRedeemText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  sectionTitle: { ...TYPOGRAPHY.captionTag, color: COLORS.textSecondary, fontWeight: 'bold', marginBottom: 10 },
  infoBox: { backgroundColor: COLORS.surface, borderRadius: RADIUS.card, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    minHeight: LAYOUT.minTouchTarget,
  },
  infoText: { flex: 1, ...TYPOGRAPHY.bodyMetadata, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: 'rgba(182, 166, 190, 0.1)', marginLeft: 48 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(182, 166, 190, 0.1)',
  },
  btnRoute: {
    backgroundColor: COLORS.accent,
    height: LAYOUT.minTouchTarget,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRouteText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});