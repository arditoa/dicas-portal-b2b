import { supabase } from './supabase';
import { Promotion, Reward, Venue } from './types';

// Helper para unificar registros de 'businesses' e 'professionals' no tipo Venue[cite: 3]
function mapToVenue(item: any, type: 'business' | 'professional'): Venue {
  return {
    id: item.id,
    name: item.name,
    category: item.category || (type === 'professional' ? 'profissional' : 'bar'),
    neighborhood: item.neighborhood || '',
    address: item.address || '',
    rating: item.rating ? Number(item.rating) : 5.0,
    price_tier: item.price_tier || '$$',
    hours: item.hours || '',
    promo: item.promo || '',
    safe_space: item.safe_space ?? true,
    tags: item.tags || [],
    emoji: item.emoji || (type === 'professional' ? '🩺' : '🍸'),
    color1: item.color1 || '#FF2D78',
    color2: item.color2 || '#7B2FF7',
   lat: item.lat ? Number(item.lat) : 0,
lng: item.lng ? Number(item.lng) : 0,
    plan: item.plan || 'gratis',
    type,
    specialty: item.specialty,
    phone: item.phone,
  };
}

// Busca todos os estabelecimentos e profissionais e unifica na camada de dados[cite: 3]
export async function fetchVenues(): Promise<Venue[]> {
  const [bRes, pRes] = await Promise.all([
    supabase.from('businesses').select('*'),
    supabase.from('professionals').select('*'),
  ]);

  if (bRes.error) console.error('Erro na tabela businesses:', JSON.stringify(bRes.error, null, 2));
  if (pRes.error) console.error('Erro na tabela professionals:', JSON.stringify(pRes.error, null, 2));

  const businesses = (bRes.data || []).map((b) => mapToVenue(b, 'business'));
  const professionals = (pRes.data || []).map((p) => mapToVenue(p, 'professional'));

  return [...businesses, ...professionals];
}

// Busca um único estabelecimento ou profissional pelo ID
export async function fetchVenue(id: string, type?: 'business' | 'professional'): Promise<Venue | null> {
  if (type === 'professional') {
    const { data } = await supabase.from('professionals').select('*').eq('id', id).single();
    return data ? mapToVenue(data, 'professional') : null;
  }

  const { data: bData } = await supabase.from('businesses').select('*').eq('id', id).single();
  if (bData) return mapToVenue(bData, 'business');

  const { data: pData } = await supabase.from('professionals').select('*').eq('id', id).single();
  if (pData) return mapToVenue(pData, 'professional');

  return null;
}

// Busca parceiros em planos patrocinados (VIP/Destaque)[cite: 3]
export async function fetchHighlighted(): Promise<Venue[]> {
  const allVenues = await fetchVenues();
  return allVenues.filter((v) => v.plan && v.plan !== 'gratis' && v.plan !== 'basico');
}

// Busca ofertas ativas na tabela 'promotions'[cite: 3]
export async function fetchActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*, businesses(name, neighborhood, category)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar promoções:', error);
    return [];
  }
  return data || [];
}

// Busca agenda completa da tabela 'events'[cite: 3]
export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, businesses(name, neighborhood)')
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar eventos:', error);
    return [];
  }
  return data || [];
}

// Busca itinerários e guias urbanos da tabela 'itineraries'[cite: 2, 3]
export async function fetchItineraries() {
  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar roteiros:', error);
    return [];
  }
  return data || [];
}

// Calcula pontos totais com base nos check-ins do usuário[cite: 3]
export async function fetchUserPoints(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao buscar pontos do usuário:', error);
    return 0;
  }

  // Cada check-in acumula 10 pontos base[cite: 3]
  return (data?.length || 0) * 10;
}

// Busca prêmios resgatáveis[cite: 3]
export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*, businesses(name)')
    .order('cost_points', { ascending: true });

  if (error) {
    return [
      { id: '1', title: 'Drink Cortesia na Entrada', cost_points: 50, business_id: '1' },
      { id: '2', title: '20% OFF no Total do Consumo', cost_points: 100, business_id: '2' },
      { id: '3', title: 'Entrada VIP sem Fila', cost_points: 150, business_id: '3' },
    ];
  }
  return data || [];
}

// Registra check-in do usuário autenticado no Supabase[cite: 3]
export async function submitCheckin(venueId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('checkins')
    .insert([{ business_id: venueId, user_id: user.id }])
    .select();

  if (error) throw error;
  return data;
}export async function fetchPromotions() {
  try {
    const allVenues = await fetchVenues();
    // Retorna apenas os locais que têm alguma promoção (promo) ou cupom (coupon_code) ativo
    return allVenues.filter((venue: any) => venue.promo || venue.coupon_code);
  } catch (error) {
    console.error("Erro ao buscar promoções:", error);
    return [];
  }
}