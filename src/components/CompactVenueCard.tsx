import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';

const CATEGORY_FALLBACKS: Record<string, string> = {
  bar: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600',
  balada: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
  experiencia: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
  comer: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
  default: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
};

export function CompactVenueCard({ venue }: { venue: any }) {
  const categoryKey = venue?.category?.toLowerCase() || 'default';
  const imageUrl =
    venue?.image_url ||
    CATEGORY_FALLBACKS[categoryKey] ||
    CATEGORY_FALLBACKS.default;

  const reviewCount = venue?.review_count || 0;
  const ratingText =
    reviewCount >= 5 ? `★ ${venue?.rating || '5.0'} (${reviewCount})` : 'Novo';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {venue?.name}
          </Text>
          <Text style={styles.rating}>{ratingText}</Text>
        </View>
        <Text style={styles.subtext} numberOfLines={1}>
          {venue?.category} • {venue?.neighborhood}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default CompactVenueCard;

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  image: {
    width: '100%',
    height: 100,
  },
  content: {
    padding: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.name.fontSize,
    fontWeight: theme.typography.name.fontWeight,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  rating: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.sponsor,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  subtext: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});