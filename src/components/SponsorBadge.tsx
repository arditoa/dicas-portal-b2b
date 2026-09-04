import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '../constants/theme';

export function SponsorBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Patrocinado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(224, 176, 100, 0.15)',
    borderColor: COLORS.sponsor,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    ...TYPOGRAPHY.captionTag,
    color: COLORS.sponsor,
    fontWeight: 'bold',
  },
});