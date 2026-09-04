export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  birthDate: string;
  createdAt: string;
}

export interface DatabaseVenue {
  id: string;
  name: string;
  category: 'bar' | 'balada' | 'comer' | 'experiencia' | 'roteiro' | 'hot' | 'turismo';
  neighborhood: string;
  city: string;
  state: string;
  distanceMeters: number;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  isSafeSpace: boolean;
  isSponsored: boolean;
  audienceTags: ('gay' | 'lesbico' | 'trans' | 'bi' | 'drag')[];
  musicTags?: string[];
  description?: string;
}

export interface DatabaseEvent {
  id: string;
  title: string;
  venueId: string;
  venueName: string;
  timeText: string;
  dateCategory: 'hoje' | 'fds' | 'outros';
  eventDate: string;
  tags: string[];
  musicTags?: string[];
  rating: number;
  reviewCount: number;
}

export interface Coupon {
  id: string;
  title: string;
  description: string;
  venueName: string;
  expiresAt: string;
  claimedAt?: string;
  code: string;
}

export interface Indication {
  id: string;
  name: string;
  city: string;
  createdAt: string;
}