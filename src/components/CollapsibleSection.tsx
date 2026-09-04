import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type CollapsibleSectionProps<T> = {
  title: string;
  items: T[] | undefined | null;
  renderItem: (item: T, index: number) => React.ReactNode;
  onSeeAll?: () => void;
  seeAllLabel?: string;
};

export function CollapsibleSection<T>({
  title,
  items,
  renderItem,
  onSeeAll,
  seeAllLabel = 'Ver todos',
}: CollapsibleSectionProps<T>) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>{seeAllLabel}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.itemsRow}>
        {items.map((item, index) => (
          <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 20, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  seeAll: { color: '#FF2D78', fontSize: 13, fontWeight: '600' },
  itemsRow: { flexDirection: 'row', gap: 12 },
});