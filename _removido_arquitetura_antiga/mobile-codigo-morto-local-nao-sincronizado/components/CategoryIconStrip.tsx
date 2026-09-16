import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { triggerImpact } from '../utils/haptics';

const CATEGORIES = [
  { id: '', label: 'Todos', icon: 'grid-outline' },
  { id: 'bar', label: 'Bares', icon: 'beer-outline' },
  { id: 'balada', label: 'Baladas', icon: 'disc-outline' },
  { id: 'experiencia', label: 'Experiência', icon: 'sparkles-outline' },
  { id: 'comer', label: 'Comer', icon: 'restaurant-outline' },
];

interface CategoryIconStripProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryIconStrip({
  selectedCategory,
  onSelectCategory,
}: CategoryIconStripProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          return (
            <TouchableOpacity
              key={cat.id || 'all'}
              style={[styles.chip, isActive && styles.chipActive]}
              activeOpacity={0.8}
              onPress={() => {
                triggerImpact('light');
                onSelectCategory(isActive ? '' : cat.id);
              }}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={isActive ? theme.colors.textPrimary : theme.colors.textSecondary}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: theme.touchTarget.minHeight,
  },
  scrollContent: {
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: 16,
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
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
});