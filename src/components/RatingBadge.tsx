import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '../constants/theme';

interface RatingBadgeProps {
  rating: number;
  reviewCount: number;
}

export function RatingBadge({ rating, reviewCount }: RatingBadgeProps) {
  if (reviewCount < 5) {
    return (
      <View style={styles.newBadge}>
        <Text style={styles.newText}>Novo</Text>
      </View>
    );
  }

  return (
    <Text style={styles.ratingText}>
      ★ {rating.toFixed(1)} <Text style={styles.countText}>({reviewCount})</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  ratingText: {
    ...TYPOGRAPHY.bodyMetadata,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  countText: {
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  newBadge: {
    backgroundColor: 'rgba(146, 192, 155, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  newText: {
    ...TYPOGRAPHY.captionTag,
    color: COLORS.positive,
    fontWeight: 'bold',
  },
});