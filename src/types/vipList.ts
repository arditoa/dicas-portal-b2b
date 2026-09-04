export interface VipEntry {
  id?: string;
  event_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  status?: 'confirmed' | 'used' | 'cancelled';
  created_at?: string;
}