import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coupon, DatabaseEvent, DatabaseVenue, Indication, UserProfile } from '../types/database';

const STORAGE_KEYS = {
  USER: '@dicas_lgbt:user',
  FAVORITES: '@dicas_lgbt:favorites',
  CUPONS: '@dicas_lgbt:claimed_coupons',
  INDICATIONS: '@dicas_lgbt:indications',
};

const SEED_VENUES: DatabaseVenue[] = [
  {
    id: 'vezpa-bar',
    name: 'Vezpa Bar',
    category: 'bar',
    neighborhood: 'Pinheiros',
    city: 'São Paulo',
    state: 'SP',
    distanceMeters: 800,
    rating: 5.0,
    reviewCount: 34,
    latitude: -23.5666,
    longitude: -46.6866,
    isSafeSpace: true,
    isSponsored: true,
    audienceTags: ['gay', 'lesbico', 'drag'],
    musicTags: ['Pop', 'Funk'],
  },
  {
    id: 'bar-da-gra',
    name: 'Bar da Gra',
    category: 'bar',
    neighborhood: 'Pinheiros',
    city: 'São Paulo',
    state: 'SP',
    distanceMeters: 450,
    rating: 5.0,
    reviewCount: 41,
    latitude: -23.5648,
    longitude: -46.6889,
    isSafeSpace: true,
    isSponsored: false,
    audienceTags: ['lesbico', 'trans', 'bi'],
    musicTags: ['Brasilidades'],
  },
  {
    id: 'zig-club',
    name: 'Zig Club',
    category: 'balada',
    neighborhood: 'Vila Madalena',
    city: 'São Paulo',
    state: 'SP',
    distanceMeters: 1400,
    rating: 4.7,
    reviewCount: 86,
    latitude: -23.5558,
    longitude: -46.6913,
    isSafeSpace: true,
    isSponsored: true,
    audienceTags: ['trans', 'drag', 'gay'],
    musicTags: ['Eletrônica', 'Pop'],
  },
  {
    id: 'roteiro-hist-sp',
    name: 'Caminhada Histórica LGBT+',
    category: 'turismo',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    distanceMeters: 2500,
    rating: 4.9,
    reviewCount: 15,
    latitude: -23.5489,
    longitude: -46.6388,
    isSafeSpace: true,
    isSponsored: false,
    audienceTags: ['gay', 'lesbico', 'trans', 'bi'],
    musicTags: [],
  },
  {
    id: 'pink-flamingo-rj',
    name: 'Pink Flamingo Bar',
    category: 'bar',
    neighborhood: 'Copacabana',
    city: 'Rio de Janeiro',
    state: 'RJ',
    distanceMeters: 1200,
    rating: 4.8,
    reviewCount: 52,
    latitude: -22.9698,
    longitude: -43.1868,
    isSafeSpace: true,
    isSponsored: true,
    audienceTags: ['gay', 'drag'],
    musicTags: ['Pop', 'Funk'],
  },
];

const SEED_EVENTS: DatabaseEvent[] = [
  {
    id: 'ev-1',
    title: 'Noite Popozuda',
    venueId: 'bar-da-gra',
    venueName: 'Bar da Gra',
    timeText: 'hoje, 22h',
    dateCategory: 'hoje',
    eventDate: new Date().toISOString().split('T')[0],
    tags: ['Gay', 'Drag'],
    musicTags: ['Pop', 'Funk'],
    rating: 5.0,
    reviewCount: 34,
  },
  {
    id: 'ev-2',
    title: 'Techno & Cia',
    venueId: 'vezpa-bar',
    venueName: 'Vezpa Bar',
    timeText: 'sex, 23h',
    dateCategory: 'fds',
    eventDate: new Date().toISOString().split('T')[0],
    tags: ['Lésbico', 'Trans & Não-binário'],
    musicTags: ['Eletrônica'],
    rating: 4.8,
    reviewCount: 12,
  },
];

export const DatabaseService = {
  async getUser(): Promise<UserProfile | null> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return json ? JSON.parse(json) : null;
  },

  async saveUser(user: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  },

  async getVenues(): Promise<DatabaseVenue[]> {
    return SEED_VENUES;
  },

  async getEvents(): Promise<DatabaseEvent[]> {
    return SEED_EVENTS;
  },

  async getFavorites(): Promise<string[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return json ? JSON.parse(json) : [];
  },

  async toggleFavorite(id: string): Promise<string[]> {
    const favorites = await this.getFavorites();
    const exists = favorites.includes(id);
    const updated = exists ? favorites.filter((favId) => favId !== id) : [...favorites, id];
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    return updated;
  },

  async getClaimedCoupons(): Promise<Coupon[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.CUPONS);
    return json ? JSON.parse(json) : [];
  },

  async claimCoupon(coupon: Coupon): Promise<Coupon[]> {
    const current = await this.getClaimedCoupons();
    if (current.some((c) => c.id === coupon.id)) return current;
    const updated = [...current, { ...coupon, claimedAt: new Date().toISOString() }];
    await AsyncStorage.setItem(STORAGE_KEYS.CUPONS, JSON.stringify(updated));
    return updated;
  },

  async submitIndication(indication: Omit<Indication, 'id' | 'createdAt'>): Promise<void> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.INDICATIONS);
    const current: Indication[] = json ? JSON.parse(json) : [];
    const newIndication: Indication = {
      ...indication,
      id: Math.random().toString(),
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.INDICATIONS, JSON.stringify([...current, newIndication]));
  },
};