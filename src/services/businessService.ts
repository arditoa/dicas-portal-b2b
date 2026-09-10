import { supabase } from '@/lib/supabase';

export interface BusinessItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  type?: string;
  audience?: string;
  latitude?: number;
  longitude?: number;
  color?: string;
  neighborhood?: string;
  address?: string;
  rating?: number;
  reviews_count?: number;
  badge?: string;
  distance?: string;
  instagram?: string;
}

// Buscar estabelecimentos por categoria
export async function getBusinessesByCategory(category: string): Promise<BusinessItem[]> {
  try {
    let query = supabase.from('businesses').select('*');

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar categoria no Supabase:', error);
      return [];
    }

    return (data as BusinessItem[]) || [];
  } catch (err) {
    console.warn('Erro ao conectar ao serviço de busca por categoria:', err);
    return [];
  }
}

// Buscar detalhe de um único estabelecimento por ID
export async function getBusinessById(id: string): Promise<BusinessItem | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar business por id no Supabase:', error);
      return null;
    }

    return data as BusinessItem;
  } catch (err) {
    console.warn('Erro ao conectar ao serviço de busca por id:', err);
    return null;
  }
}