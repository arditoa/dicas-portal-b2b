import { createClient } from '@supabase/supabase-js';

// Mesmas chaves públicas (anon) já usadas no app mobile e no
// portal-b2b-lgbt — este site fala com o MESMO projeto Supabase, só grava
// na tabela leads_institucionais (RLS já permite insert público, usada
// hoje pelo /contato do portal).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
