import { FilterState, PrivacyState, Venue } from './types';

// Regra Crítica de Segurança (Seção 6 do Projeto):
// Ativar o Modo Discreto SEMPRE desliga o status de solteiro(a) junto.
export function applyDiscreetModeToggle(current: PrivacyState, nextDiscreet: boolean): PrivacyState {
  if (nextDiscreet) {
    return { discreetMode: true, isSingle: false };
  }
  return { ...current, discreetMode: false };
}

// Lógica Pura de Filtragem de Estabelecimentos
export function filterVenues(venues: Venue[], filters: FilterState): Venue[] {
  return venues.filter((v) => {
    if (filters.selectedCategory && filters.selectedCategory !== 'all') {
      if (v.category.toLowerCase() !== filters.selectedCategory.toLowerCase()) {
        return false;
      }
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const matchName = v.name?.toLowerCase().includes(q);
      const matchNeigh = v.neighborhood?.toLowerCase().includes(q);
      if (!matchName && !matchNeigh) return false;
    }

    // Tratamento seguro para 'v.tags' que pode ser undefined
    if (filters.selectedTags && filters.selectedTags.length > 0) {
      const venueTags = v.tags || [];
      const hasMatchingTag = venueTags.some((t) => filters.selectedTags?.includes(t));
      if (!hasMatchingTag) return false;
    }

    return true;
  });
}

// Cálculo da distância Haversine
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ordenação segura garantindo que lat e lng sejam numéricos
export function sortByDistance(
  venues: Venue[],
  userCoords: { lat: number; lng: number }
): Venue[] {
  return [...venues].sort((a, b) => {
    const latA = a.lat ?? 0;
    const lngA = a.lng ?? 0;
    const latB = b.lat ?? 0;
    const lngB = b.lng ?? 0;

    const distA = calculateDistance(userCoords.lat, userCoords.lng, latA, lngA);
    const distB = calculateDistance(userCoords.lat, userCoords.lng, latB, lngB);

    return distA - distB;
  });
}