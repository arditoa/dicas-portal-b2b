import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { ViewMode } from '../types';
import { triggerImpact } from '../utils/haptics';

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function SegmentedToggle({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          triggerImpact('light');
          onChange('mapa');
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'mapa' }}
        style={[styles.segment, value === 'mapa' && styles.segmentActive]}
      >
        <Text style={[styles.label, value === 'mapa' && styles.labelActive]}>🗺️ Mapa</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          triggerImpact('light');
          onChange('lista');
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'lista' }}
        style={[styles.segment, value === 'lista' && styles.segmentActive]}
      >
        <Text style={[styles.label, value === 'lista' && styles.labelActive]}>☰ Lista</Text>
      </Pressable>
    </View>
  );
}

export default SegmentedToggle;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.borderRadius.button,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
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