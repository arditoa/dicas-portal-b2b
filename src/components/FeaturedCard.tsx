import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type FeaturedCardProps = {
  name: string;
  category: string;
  neighborhood: string;
  rating?: number;
  planLabel?: string;
};

export function FeaturedCard({
  name,
  category,
  neighborhood,
  rating,
  planLabel = 'DESTAQUE',
}: FeaturedCardProps) {
  const categoryFormatted = category
    ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
    : 'Local';

  return (
    <View style={styles.card}>
      <View style={styles.thumb}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={24} color="#FF2D78" />
        </View>

        {planLabel && (
          <View style={styles.badge}>
            <Ionicons name="star" size={10} color="#F5C518" style={{ marginRight: 3 }} />
            <Text style={styles.badgeText}>{planLabel}</Text>
          </View>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.meta} numberOfLines={1}>{categoryFormatted} · {neighborhood}</Text>
      
      {typeof rating === 'number' && (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#F5C518" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      )}
    </View>
  );
}

export default FeaturedCard;

const styles = StyleSheet.create({
  card: { width: 168 },
  thumb: {
    height: 100,
    borderRadius: 14,
    backgroundColor: '#110D1B',
    borderWidth: 1,
    borderColor: '#262238',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#20152B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3E1224',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0A14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262238',
  },
  badgeText: { color: '#F5C518', fontSize: 9, fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  meta: { color: '#8A889D', fontSize: 12, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  ratingText: { color: '#F5C518', fontSize: 11, fontWeight: '700' },
});