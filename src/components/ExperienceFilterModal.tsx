import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { triggerImpact } from '../utils/haptics';

const VIBE_FILTERS = [
  'Público Trans & Non-Binary',
  'Sertanejo & Pop',
  'Eletrônico / Techno',
  'Urso & Fetichista',
  'Drag Show & Arte',
];

interface FilterModalProps {
  visible: boolean;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  onClose: () => void;
}

export function ExperienceFilterModal({
  visible,
  selectedFilter,
  onSelectFilter,
  onClose,
}: FilterModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtrar Agenda de Festas</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.filterList}>
            <TouchableOpacity
              style={[
                styles.filterItem,
                selectedFilter === 'Todos' && styles.filterItemActive,
              ]}
              onPress={() => {
                triggerImpact('light');
                onSelectFilter('Todos');
                onClose();
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === 'Todos' && styles.filterTextActive,
                ]}
              >
                Todas as Vibes
              </Text>
              {selectedFilter === 'Todos' && (
                <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
              )}
            </TouchableOpacity>

            {VIBE_FILTERS.map((vibe) => {
              const isActive = selectedFilter === vibe;
              return (
                <TouchableOpacity
                  key={vibe}
                  style={[styles.filterItem, isActive && styles.filterItemActive]}
                  onPress={() => {
                    triggerImpact('light');
                    onSelectFilter(vibe);
                    onClose();
                  }}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {vibe}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.card,
    borderTopRightRadius: theme.borderRadius.card,
    padding: 20,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterList: {
    gap: 8,
  },
  filterItem: {
    minHeight: theme.touchTarget.minHeight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.button,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterItemActive: {
    borderColor: theme.colors.accent,
  },
  filterText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
});