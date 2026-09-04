import { supabase } from '../lib/supabase';

export const doorService = {
  // Buscar convidados da Lista VIP para a portaria
  async getEventGuests(eventId: string) {
    const { data, error } = await supabase
      .from('vip_lists')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  // Confirmar/Alterar entrada do convidado na portaria
  async checkInGuest(guestId: string, status: 'pending' | 'checked_in' | 'cancelled' = 'checked_in') {
    const { data, error } = await supabase
      .from('vip_lists')
      .update({ status })
      .eq('id', guestId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Validar código do cupom no caixa
  async validateCouponCode(code: string, venueId: string) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new Error('Cupom inválido, esgotado ou expirado.');
    return data;
  },

  // Confirmar resgate do cupom
  async redeemCoupon(couponId: string) {
    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .eq('id', couponId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
};