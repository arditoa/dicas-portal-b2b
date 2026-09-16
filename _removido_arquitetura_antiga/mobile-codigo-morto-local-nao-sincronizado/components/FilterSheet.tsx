import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { VenueCategory } from '../types';
import { CategoryChips } from './CategoryChips';

interface Props {
  visible: boolean;
  selected: VenueCategory | 'todos';
  onSelect: (category: VenueCategory | 'todos') => void;
  onClose: () => void;
}

export function FilterSheet({ visible, selected, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filtros</Text>
            {selected !== 'todos' && (
              <Pressable onPress={() => onSelect('todos')} accessibilityRole="button">
                <Text style={styles.clear}>Limpar</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.sectionLabel}>Categoria</Text>
          <CategoryChips selected={selected} onSelect={onSelect} />

          <Pressable style={styles.applyButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.applyLabel}>Ver resultados</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default FilterSheet;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.card,
    borderTopRightRadius: theme.borderRadius.card,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    fontSize: theme.typography.name.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  clear: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  applyButton: {
    marginTop: 12,
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.borderRadius.button,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyLabel: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});