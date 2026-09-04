import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '../constants/theme';

export function HighlightBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>🌟 Destaque Dicas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(255, 111, 160, 0.15)',
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    ...TYPOGRAPHY.captionTag,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
});