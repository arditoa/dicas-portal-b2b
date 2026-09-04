import { supabase } from '../lib/supabase';
import { Coupon } from '../types/coupon';

export const couponService = {
  async getVenueCoupons(venueId: string): Promise<Coupon[]> {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createCoupon(coupon: Omit<Coupon, 'id' | 'created_at' | 'used_count'>): Promise<Coupon> {
    const { data, error } = await supabase
      .from('coupons')
      .insert([coupon])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async toggleStatus(couponId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: isActive })
      .eq('id', couponId);

    if (error) throw new Error(error.message);
  }
};