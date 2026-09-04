import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { RatingBadge } from '../../components/RatingBadge';
import { COLORS, LAYOUT, RADIUS, TYPOGRAPHY } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const PUBLIC_FILTERS = ['Todos os Públicos', 'Lésbico', 'Gay', 'Trans & Não-binário', 'Bissexual+'];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todas Categorias', icon: 'grid-outline' },
  { id: 'bar', label: 'Bares', icon: 'beer-outline' },
  { id: 'club', label: 'Baladas', icon: 'musical-notes-outline' },
  { id: 'cafe', label: 'Cafés', icon: 'cafe-outline' },
  { id: 'experience', label: 'Experiência', icon: 'sparkles-outline' },
  { id: 'tourism', label: 'Turismo & Roteiro', icon: 'map-outline' },
];

const MAP_LOCATIONS = [
  {
    id: '1',
    name: 'Vezpa Bar',
    category: 'BAR',
    categoryType: 'bar',
    publicType: 'Gay',
    neighborhood: 'Pinheiros',
    distance: '800m',
    rating: 5.0,
    reviewCount: 34,
    isSafeSpace: true,
    coordinate: { latitude: -23.5558, longitude: -46.6815 },
  },
  {
    id: '2',
    name: 'Zig Club',
    category: 'BALADA',
    categoryType: 'club',
    publicType: 'Lésbico',
    neighborhood: 'Vila Madalena',
    distance: '1.2km',
    rating: 4.8,
    reviewCount: 86,
    isSafeSpace: true,
    coordinate: { latitude: -23.5505, longitude: -46.689 },
  },
  {
    id: '3',
    name: 'Drag Brunch & Art',
    category: 'EXPERIÊNCIA',
    categoryType: 'experience',
    publicType: 'Geral / Todos bem-vindos',
    neighborhood: 'Jardins',
    distance: '2.1km',
    rating: 4.9,
    reviewCount: 45,
    isSafeSpace: true,
    coordinate: { latitude: -23.5612, longitude: -46.6688 },
  },
  {
    id: '4',
    name: 'Roteiro Histórico Queer',
    category: 'TURISMO & ROTEIRO',
    categoryType: 'tourism',
    publicType: 'Geral / Todos bem-vindos',
    neighborhood: 'Centro Histórico',
    distance: '3.0km',
    rating: 5.0,
    reviewCount: 29,
    isSafeSpace: true,
    coordinate: { latitude: -23.5489, longitude: -46.6388 },
  },
];

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1824' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1824' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8399' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c4bdce' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a8399' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#12241b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262235' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1824' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#332d47' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1326' }] },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublic, setSelectedPublic] = useState('Todos os Públicos');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVenue, setSelectedVenue] = useState(MAP_LOCATIONS[0]);

  const handleOpenRoute = () => {
    if (!selectedVenue) return;
    const { latitude, longitude } = selectedVenue.coordinate;
    const label = encodeURIComponent(selectedVenue.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });

    if (url) Linking.openURL(url);
  };

  const filteredLocations = MAP_LOCATIONS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPublic = selectedPublic === 'Todos os Públicos' || item.publicType === selectedPublic;
    const matchesCategory = selectedCategory === 'all' || item.categoryType === selectedCategory;

    return matchesSearch && matchesPublic && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          latitude: -23.553,
          longitude: -46.685,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {filteredLocations.map((location) => {
          const isSelected = selectedVenue?.id === location.id;
          return (
            <Marker
              key={location.id}
              coordinate={location.coordinate}
              onPress={() => setSelectedVenue(location)}
            >
              <View style={[styles.markerPin, isSelected && styles.markerPinSelected]}>
                <Ionicons
                  name={
                    location.categoryType === 'bar'
                      ? 'beer-outline'
                      : location.categoryType === 'club'
                      ? 'musical-notes-outline'
                      : location.categoryType === 'experience'
                      ? 'sparkles-outline'
                      : 'map-outline'
                  }
                  size={18}
                  color="#FFF"
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Camada Superior: Busca + Filtro de Público */}
      <View style={styles.topContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.accent} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar no mapa..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topChipsScroll}>
          {PUBLIC_FILTERS.map((item) => {
            const active = selectedPublic === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.topChip, active && styles.topChipActive]}
                onPress={() => setSelectedPublic(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.topChipText, active && styles.topChipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Camada Inferior: Categorias (com Experiência e Turismo) + Card */}
      <View style={styles.bottomContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
          {CATEGORY_FILTERS.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={16}
                  color={active ? '#FFF' : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedVenue && (
          <View style={styles.venueCard}>
            <View style={styles.venueInfo}>
              <View style={styles.venueTitleRow}>
                <Text style={styles.venueName}>{selectedVenue.name}</Text>
                {selectedVenue.isSafeSpace && (
                  <View style={styles.safeSpaceBadge}>
                    <Ionicons name="checkmark-sharp" size={12} color="#FFF" style={{ marginRight: 2 }} />
                    <Text style={styles.safeSpaceText}>Safe Space</Text>
                  </View>
                )}
              </View>

              <Text style={TYPOGRAPHY.bodyMetadata}>
                {selectedVenue.category} • {selectedVenue.neighborhood} • {selectedVenue.distance}
              </Text>

              <View style={{ marginTop: 4 }}>
                <RatingBadge rating={selectedVenue.rating} reviewCount={selectedVenue.reviewCount} />
              </View>
            </View>

            <TouchableOpacity style={styles.routeBtn} onPress={handleOpenRoute} activeOpacity={0.8}>
              <Ionicons name="navigate-sharp" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { width: width, height: height },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.sponsor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPinSelected: {
    backgroundColor: COLORS.accent,
    borderColor: '#FFF',
    transform: [{ scale: 1.15 }],
  },
  topContainer: { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: LAYOUT.minTouchTarget,
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  topChipsScroll: { paddingHorizontal: 20, gap: 8, marginTop: 12 },
  topChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  topChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  topChipText: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textSecondary, fontWeight: '500' },
  topChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  bottomContainer: { position: 'absolute', bottom: 20, left: 0, right: 0, zIndex: 10 },
  categoryChipsScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  categoryChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  categoryChipText: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textSecondary, fontWeight: '500' },
  categoryChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  venueCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: RADIUS.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  venueInfo: { flex: 1, marginRight: 12 },
  venueTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  venueName: { ...TYPOGRAPHY.venueName, fontSize: 17 },
  safeSpaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 111, 160, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  safeSpaceText: { ...TYPOGRAPHY.captionTag, color: COLORS.accent, fontWeight: 'bold' },
  routeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
});