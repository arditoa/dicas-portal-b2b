import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { supabase } from '../../lib/supabase';

// 1. Chips de Categoria Principal
const CATEGORY_CHIPS = [
  { id: 'all', name: 'Todos' },
  { id: 'places', name: 'Lugares' },
  { id: 'gastronomy', name: 'Gastronomia' },
  { id: 'culture', name: 'Cultura' },
  { id: 'events', name: 'Agenda' },
  { id: 'tourism', name: 'Turismo' },
];

// 2. Chips de Preferência / Público (Design Minimalista sem Emojis)
const AUDIENCE_FILTERS = [
  { id: 'all_audiences', name: 'Todos os Públicos' },
  { id: 'gay', name: 'Gay' },
  { id: 'lesbian', name: 'Lésbica' },
  { id: 'trans', name: 'Trans & NB' },
  { id: 'bears', name: 'Ursos' },
  { id: 'bi', name: 'Bi+' },
];

// 3. Legenda Completa das 6 Categorias
const MAP_LEGEND_ITEMS = [
  { label: 'Lugares', color: '#E1306C' },
  { label: 'Gastronomia', color: '#FFB74D' },
  { label: 'Cultura', color: '#7E57C2' },
  { label: 'Agenda', color: '#4FC3F7' },
  { label: 'Turismo', color: '#5C6BC0' },
  { label: 'Serviços', color: '#81C784' },
];

export interface MapPlace {
  id: string;
  name: string;
  category: string;
  audience?: string;
  latitude: number;
  longitude: number;
  color: string;
  neighborhood: string;
}

const INITIAL_REGION = {
  latitude: -23.55052,
  longitude: -46.633308,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function ExploreScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAudience, setSelectedAudience] = useState('all_audiences');
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, category, audience, latitude, longitude, color, neighborhood');

      if (error || !data || data.length === 0) {
        setPlaces([
          { id: 'bar-da-gra', name: 'Bar da Gra', category: 'places', audience: 'lesbian', latitude: -23.5615, longitude: -46.6825, color: '#E1306C', neighborhood: 'Pinheiros' },
          { id: 'castro-bar', name: 'Castro Bar', category: 'places', audience: 'gay', latitude: -23.5552, longitude: -46.6582, color: '#E1306C', neighborhood: 'Consolação' },
          { id: 'vezpa-bar', name: 'Vezpa Bar', category: 'gastronomy', audience: 'all_audiences', latitude: -23.5631, longitude: -46.6854, color: '#FFB74D', neighborhood: 'Pinheiros' },
          { id: 'casa-1', name: 'Casa 1', category: 'culture', audience: 'trans', latitude: -23.5489, longitude: -46.6432, color: '#7E57C2', neighborhood: 'Bela Vista' },
          { id: 'zig-club', name: 'Zig Club', category: 'events', audience: 'all_audiences', latitude: -23.5582, longitude: -46.6882, color: '#4FC3F7', neighborhood: 'Vila Madalena' },
        ]);
      } else {
        setPlaces(data as MapPlace[]);
      }
    } catch (e) {
      console.warn('Erro ao carregar locais:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaces = places.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchAudience = selectedAudience === 'all_audiences' || p.audience === selectedAudience;
    return matchCategory && matchAudience;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121216" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header Padronizado */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logolinear-semfundo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subTitle}>Mapa Interativo</Text>
        </View>

        {/* Linha 1: Categorias Principais */}
        <View style={styles.chipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {CATEGORY_CHIPS.map((chip) => {
              const isSelected = selectedCategory === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedCategory(chip.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {chip.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Linha 2: Filtros de Público Minimalistas */}
        <View style={[styles.chipsContainer, { marginBottom: 12 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {AUDIENCE_FILTERS.map((aud) => {
              const isSelected = selectedAudience === aud.id;
              return (
                <TouchableOpacity
                  key={aud.id}
                  style={[styles.audienceChip, isSelected && styles.audienceChipActive]}
                  onPress={() => setSelectedAudience(aud.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.audienceText, isSelected && styles.audienceTextActive]}>
                    {aud.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Container do Mapa */}
        <View style={styles.mapWrapper}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#E1306C" />
              <Text style={styles.loadingText}>Carregando espaços...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={INITIAL_REGION}
            >
              {filteredPlaces.map((place) => (
                <Marker
                  key={place.id}
                  coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                  onPress={() => setSelectedPlace(place)}
                >
                  <View style={[styles.customPin, { backgroundColor: place.color || '#E1306C' }]}>
                    <Feather name="map-pin" size={14} color="#FFF" />
                  </View>

                  <Callout tooltip onPress={() => router.push(`/business/${place.id}`)}>
                    <View style={styles.calloutCard}>
                      <Text style={styles.calloutTitle}>{place.name}</Text>
                      <Text style={styles.calloutSub}>{place.neighborhood}</Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}

          {/* Legenda das Categorias */}
          <View style={styles.mapLegend}>
            <Text style={styles.legendTitle}>Legenda das Categorias</Text>
            <View style={styles.legendGrid}>
              {MAP_LEGEND_ITEMS.map((item) => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Card Flutuante de Local Selecionado */}
        {selectedPlace && (
          <View style={styles.selectedPlaceCard}>
            <View style={styles.selectedPlaceHeader}>
              <View>
                <Text style={styles.selectedPlaceTitle}>{selectedPlace.name}</Text>
                <Text style={styles.selectedPlaceSub}>{selectedPlace.neighborhood}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPlace(null)} style={styles.closeBtn}>
                <Feather name="x" size={18} color="#A0A0B0" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => router.push(`/business/${selectedPlace.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.detailBtnText}>Ver detalhes do local</Text>
              <Feather name="arrow-right" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 12 },
  logoImage: { width: 150, height: 30, marginLeft: -4, marginBottom: 4 },
  subTitle: { fontSize: 13, color: '#A0A0B0', fontWeight: '500' },
  chipsContainer: { marginBottom: 6 },
  chipsScroll: { paddingHorizontal: 20, gap: 8 },
  
  // Categorias principais
  chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1C1B26', borderWidth: 1, borderColor: '#2D2B3D' },
  chipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#A0A0B0' },
  chipTextActive: { color: '#FFFFFF' },

  // Filtros de público minimalistas
  audienceChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#181722', borderWidth: 1, borderColor: '#292738' },
  audienceChipActive: { backgroundColor: '#7E57C2', borderColor: '#7E57C2' },
  audienceText: { fontSize: 11, fontWeight: '600', color: '#8A8A9E' },
  audienceTextActive: { color: '#FFFFFF' },

  // Mapa e Legenda
  mapWrapper: { flex: 1, marginHorizontal: 20, marginBottom: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: '#1C1B26', borderWidth: 1, borderColor: '#2D2B3D', position: 'relative' },
  map: { width: '100%', height: '100%' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#A0A0B0', fontSize: 13 },
  customPin: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  calloutCard: { backgroundColor: '#1C1B26', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2D2B3D', width: 130 },
  calloutTitle: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  calloutSub: { color: '#A0A0B0', fontSize: 10 },
  mapLegend: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(28, 27, 38, 0.94)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D' },
  legendTitle: { fontSize: 10, fontWeight: '700', color: '#A0A0B0', marginBottom: 6, textTransform: 'uppercase' },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '30%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#FFFFFF', fontWeight: '500' },
  
  // Card Flutuante
  selectedPlaceCard: { position: 'absolute', bottom: 80, left: 20, right: 20, backgroundColor: '#1C1B26', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#2D2B3D', gap: 12 },
  selectedPlaceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  selectedPlaceTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  selectedPlaceSub: { fontSize: 12, color: '#A0A0B0' },
  closeBtn: { padding: 4 },
  detailBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E1306C', paddingVertical: 10, borderRadius: 10, gap: 8 },
  detailBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});