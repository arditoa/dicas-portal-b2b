import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ItineraryCardProps = {
  city: string;
  title: string;
  durationLabel?: string;
  description?: string;
  color1?: string;
  color2?: string;
};

export function ItineraryCard({
  city,
  title,
  durationLabel,
  description,
  color1 = '#7B2FF7',
  color2 = '#4A1FA0',
}: ItineraryCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.cover, { backgroundColor: color1 }]}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color2, opacity: 0.45 }]} />
        <View style={styles.cityBadge}>
          <Text style={styles.cityBadgeText}>{city.toUpperCase()}</Text>
        </View>
        {durationLabel && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{durationLabel}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {description && <Text style={styles.description} numberOfLines={2}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 220 },
  cover: {
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    padding: 10,
    justifyContent: 'space-between',
  },
  cityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cityBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  description: { color: '#8A889D', fontSize: 12, marginTop: 2 },
});export default ItineraryCard;