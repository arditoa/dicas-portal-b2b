import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
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
  pinkSoft: 'rgba(225, 48, 108, 0.15)',
  purple: '#7E57C2',
  gold: '#FFD54F',
  green: '#81C784',
};

// Dados detalhados para cada banner em destaque
const BANNER_DATA: Record<string, { title: string; tag: string; desc: string; color: string; items: any[] }> = {
  'roteiros-lgbt': {
    title: 'Destinos e Roteiros LGBT+',
    tag: 'DICAS TRIP',
    desc: 'Guia especial apresentado na Conferência de Turismo com os melhores destinos acolhedores do Brasil.',
    color: COLORS.green,
    items: [
      { id: 'hotel-aurora', name: 'Hotel Aurora', desc: 'Hospedagem inclusiva & Spa · Pinheiros', rating: '4.8', dist: '900m', badge: 'Cupom 15%' },
      { id: 'pousada-rosa', name: 'Pousada Solar da Praia', desc: 'Roteiro Litoral & Natureza', rating: '4.9', dist: 'Praia', badge: 'Safe Space' },
    ],
  },
  'membros-fundadores': {
    title: 'Membros Fundadores',
    tag: 'MEMBRO FUNDADOR',
    desc: 'Conheça os espaços históricos e estabelecimentos parceiros que ajudaram a construir nossa comunidade.',
    color: COLORS.gold,
    items: [
      { id: 'vezpa-bar', name: 'Vezpa Bar', desc: 'Bar & Coquetelaria · Pinheiros', rating: '4.8', dist: '800m', badge: 'Membro Fundador' },
      { id: 'zig-club', name: 'Zig Club', desc: 'Balada & Shows · Barra Funda', rating: '4.9', dist: '2.4km', badge: 'Membro Fundador' },
    ],
  },
  'espacos-destaque': {
    title: 'Espaços em Destaque',
    tag: 'DESTAQUE',
    desc: 'Locais patrocinados e parceiros em alta com vantagens exclusivas para membros da comunidade.',
    color: COLORS.pink,
    items: [
      { id: 'barbearia-prisma', name: 'Barbearia Prisma', desc: 'Barbearia & Estética Inclusiva · Centro', rating: '5.0', dist: '1.1km', badge: 'Patrocinado' },
      { id: 'cafe-aurora', name: 'Café Aurora', desc: 'Bistrô & Café Acolhedor · Bela Vista', rating: '4.7', dist: '1.8km', badge: 'Destaque' },
    ],
  },
};

export default function BannerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const currentBanner = BANNER_DATA[id || ''] || {
    title: 'Destaque da Comunidade',
    tag: 'ESPECIAL',
    desc: 'Confira a seleção de espaços e parceiros em alta.',
    color: COLORS.purple,
    items: [],
  };

  return (
    <View style={styles.container}>
      {/* Topbar */}
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>{currentBanner.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner Hero */}
        <View style={styles.heroCard}>
          <View style={[styles.tagBadge, { backgroundColor: currentBanner.color }]}>
            <Text style={styles.tagText}>{currentBanner.tag}</Text>
          </View>
          <Text style={styles.heroTitle}>{currentBanner.title}</Text>
          <Text style={styles.heroDesc}>{currentBanner.desc}</Text>
        </View>

        {/* Lista de Estabelecimentos do Destaque */}
        <Text style={styles.sectionTitle}>Locais nesta seleção</Text>
        <View style={styles.list}>
          {currentBanner.items.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="info" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Em breve novos locais adicionados nesta seleção.</Text>
            </View>
          ) : (
            currentBanner.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/business/${item.id}` as any)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.rating}>★ {item.rating}</Text>
                </View>
                <Text style={styles.cardDesc}>{item.desc} · {item.dist}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topbarTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },

  scroll: { paddingHorizontal: 16, paddingVertical: 16, gap: 16 },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  tagBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '800', color: '#000' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  heroDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  list: { gap: 12 },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  rating: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.pinkSoft,
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: COLORS.pink, fontSize: 10, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});