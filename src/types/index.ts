export type VenueCategory = 'bar' | 'balada' | 'comer' | 'roteiro' | 'hot';

export interface Venue {
  id: string;
  name: string;
  category: VenueCategory;
  neighborhood: string;
  distanceMeters?: number;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  isSafeSpace: boolean;
  isSponsored: boolean;
  image_url?: string;
  promo?: string;
}

export type ViewMode = 'mapa' | 'lista';

export interface CategoryOption {
  key: VenueCategory | 'todos';
  label: string;
}
