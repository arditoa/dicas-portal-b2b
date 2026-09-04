import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

const ITEMS: { label: string; color: string }[] = [
  { label: 'Bar', color: theme.colors.accent },
  { label: 'Patrocinado', color: theme.colors.sponsor },
  { label: 'Balada', color: '#A855F7' },
];

/**
 * Legenda fixa no canto do mapa — resolve o achado "pins sem legenda":
 * sincronizada com os tokens unificados em constants/theme.ts.
 */
export function MapLegend() {
  return (
    <View style={styles.box}>
      {ITEMS.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default MapLegend;

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(29, 23, 38, 0.92)',
    borderRadius: theme.borderRadius.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: theme.typography.caption.fontWeight,
    color: theme.colors.textSecondary,
  },
});