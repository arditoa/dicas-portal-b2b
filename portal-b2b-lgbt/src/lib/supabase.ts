import { createClient } from '@supabase/supabase-js';

// Puxando as chaves exatas do seu .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Criando e exportando o cliente para ser usado no Dashboard
export const supabase = createClient(supabaseUrl, supabaseAnonKey);