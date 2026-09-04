import { supabase } from '../lib/supabase';

export const vipService = {
  async joinList(eventId: string, fullName: string, email: string) {
    const { data, error } = await supabase
      .from('vip_lists')
      .insert([{ event_id: eventId, full_name: fullName, email, status: 'pending' }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getListByEvent(eventId: string) {
    const { data, error } = await supabase
      .from('vip_lists')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async updateStatus(id: string, status: 'pending' | 'checked_in' | 'cancelled') {
    const { data, error } = await supabase
      .from('vip_lists')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
};

// Alias de exportação para evitar erros de importação nos hooks e telas
export const vipListService = vipService;