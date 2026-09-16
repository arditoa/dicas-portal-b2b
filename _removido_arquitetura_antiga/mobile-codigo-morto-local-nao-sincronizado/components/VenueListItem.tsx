import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { Venue } from '../types';

interface Props {
  venue: Venue;
  onPress: () => void;
}

export function VenueListItem({ venue, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.thumb} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {venue.name}
          </Text>
          {venue.isSponsored && <Text style={styles.sponsoredTag}>Patrocinado</Text>}
        </View>
        <Text style={styles.meta}>
          {venue.neighborhood} · {venue.isSafeSpace ? '🛡️ Safe Space · ' : ''}★{venue.rating.toFixed(1)} (
          {venue.reviewCount})
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.card / 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    fontSize: theme.typography.name.fontSize,
    fontWeight: theme.typography.name.fontWeight,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  sponsoredTag: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.sponsor,
    fontWeight: 'bold',
  },
  meta: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
