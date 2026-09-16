import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  activeCount: number;
  onPress: () => void;
}

export function FilterButton({ activeCount, onPress }: Props) {
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={activeCount > 0 ? `Filtros, ${activeCount} ativo` : 'Filtros'}
    >
      <View style={styles.left}>
        <Text style={styles.icon}>⚙️</Text>
        <Text style={styles.label}>Filtros</Text>
      </View>
      {activeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{activeCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default FilterButton;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.touchTarget.minHeight,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 14 },
  label: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});