import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

export interface VenueCardProps {
  id?: string;
  name?: string;
  title?: string;
  bio?: string;
  coverImage?: string;
  image?: string;
  category?: string;
  neighborhood?: string;
  distance?: string;
  tagsPublicoVibe?: string[];
  tagsComodidades?: string[];
  onPress?: () => void;
  [key: string]: any; // Permite propriedades adicionais passadas pelo near.tsx
}

export function VenueCard(props: VenueCardProps) {
  const {
    name,
    title,
    bio,
    coverImage,
    image,
    category,
    neighborhood,
    distance,
    tagsPublicoVibe = [],
    tagsComodidades = [],
    onPress,
  } = props;

  const displayName = name || title || 'Espaço';
  const displayImage = coverImage || image;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      {displayImage ? (
        <Image source={{ uri: displayImage }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.placeholderCover]}>
          <Text style={styles.placeholderText}>🌈 Dicas LGBT</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {displayName}
          </Text>
          {category ? <Text style={styles.categoryBadge}>{category}</Text> : null}
        </View>

        {(neighborhood || distance) ? (
          <Text style={styles.locationText}>
            📍 {neighborhood || ''} {neighborhood && distance ? '•' : ''} {distance || ''}
          </Text>
        ) : null}

        {bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {bio}
          </Text>
        ) : null}

        {tagsPublicoVibe.length > 0 && (
          <View style={styles.tagContainer}>
            {tagsPublicoVibe.map((tag) => (
              <View key={tag} style={styles.vibeBadge}>
                <Text style={styles.vibeBadgeText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {tagsComodidades.length > 0 && (
          <View style={styles.tagContainer}>
            {tagsComodidades.map((item) => (
              <View key={item} style={styles.comodidadeBadge}>
                <Text style={styles.comodidadeBadgeText}>✓ {item}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cover: {
    width: '100%',
    height: 160,
  },
  placeholderCover: {
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D28D9',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  vibeBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vibeBadgeText: {
    color: '#7E22CE',
    fontSize: 12,
    fontWeight: '600',
  },
  comodidadeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comodidadeBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
});
