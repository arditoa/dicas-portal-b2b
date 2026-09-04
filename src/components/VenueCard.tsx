import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '../constants/theme';
import { RatingBadge } from './RatingBadge';

interface VenueCardProps {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  distance: string;
  image: string;
  deal?: string | null;
  rating: number;
  reviewCount: number;
  onPress: () => void;
}

export function VenueCard({
  name,
  category,
  neighborhood,
  distance,
  image,
  deal,
  rating,
  reviewCount,
  onPress,
}: VenueCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Image source={{ uri: image }} style={styles.thumb} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          <RatingBadge rating={rating} reviewCount={reviewCount} />
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {category.toUpperCase()} • {neighborhood} • {distance}
        </Text>

        {deal && (
          <View style={styles.dealTag}>
            <Ionicons name="ticket-outline" size={13} color={COLORS.accent} />
            <Text style={styles.dealText}>{deal}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    marginBottom: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.1)',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.card - 4,
    backgroundColor: 'rgba(182, 166, 190, 0.15)',
  },
  body: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { ...TYPOGRAPHY.venueName, flex: 1, marginRight: 8 },
  subtitle: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textSecondary, marginBottom: 8 },
  dealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 111, 160, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    gap: 4,
  },
  dealText: { ...TYPOGRAPHY.captionTag, color: COLORS.accent, fontWeight: 'bold' },
});