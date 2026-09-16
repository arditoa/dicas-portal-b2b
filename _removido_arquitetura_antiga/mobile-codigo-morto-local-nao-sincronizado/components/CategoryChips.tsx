import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { theme } from '../constants/theme';

export type VenueCategory = 'bar' | 'balada' | 'comer' | 'roteiro' | 'hot';

export interface CategoryOption {
  key: VenueCategory;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'bar', label: 'Bares' },
  { key: 'balada', label: 'Baladas' },
  { key: 'comer', label: 'Comer' },
  { key: 'roteiro', label: 'Roteiros' },
  { key: 'hot', label: 'Hot' },
];

interface Props {
  selected: VenueCategory | 'todos';
  onSelect: (category: VenueCategory | 'todos') => void;
}

/**
 * Chips de categoria. Este componente existe em UM único lugar do app: a tela
 * Explorar & Descobrir. Não duplicar na Home (Item 14 da auditoria de UX).
 */
export function CategoryChips({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {CATEGORIES.map((c) => {
        const active = selected === c.key;
        return (
          <Pressable
            key={c.key}
            onPress={() => onSelect(active ? 'todos' : c.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={6}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default CategoryChips;

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: theme.borderRadius.button,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  label: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
});