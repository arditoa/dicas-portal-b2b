import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '@/constants/theme';

interface HighlightBadgeProps {
  label: string;
  color?: string;
}

export default function HighlightBadge({ label, color }: HighlightBadgeProps) {
  const badgeColor = color || THEME?.pink || '#E1306C';

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
      <Text style={[styles.label, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
