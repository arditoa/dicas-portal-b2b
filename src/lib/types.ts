export interface PrivacyState {
  discreetMode: boolean;
  isSingle: boolean;
}

export interface FilterState {
  selectedCategory?: string;
  openNowOnly?: boolean;
  selectedTags?: string[];
  searchQuery?: string;
}

export interface Venue {
  id: string;
  name: string;
  category: string;
  neighborhood?: string;
  address?: string;
  rating?: number;
  price_tier?: string;
  hours?: string;
  promo?: string;
  coupon_code?: string;
  safe_space?: boolean;
  tags?: string[];
  emoji?: string;
  color1?: string;
  color2?: string;
  lat?: number;
  lng?: number;
  plan?: string;
  type?: 'business' | 'professional';
  specialty?: string;
  phone?: string;
  is_favorite?: boolean;
}

export interface Promotion {
  id: string;
  business_id: string;
  title?: string;
  description: string;
  discount_tag?: string;
  valid_until_text?: string;
  active_from?: string;
  active_to?: string;
  businesses?: {
    name: string;
    neighborhood?: string;
    category?: string;
  };
}

export interface Reward {
  id: string;
  title: string;
  cost_points: number;
  business_id: string;
  description?: string;
  businesses?: {
    name: string;
  };
}