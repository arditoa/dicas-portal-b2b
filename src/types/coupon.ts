export interface Coupon {
  id?: string;
  venue_id: string;
  title: string;
  description?: string;
  code: string;
  discount_percent: number;
  max_uses?: number;
  used_count?: number;
  is_active?: boolean;
  created_at?: string;
}