import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// CREDENCIAIS OFICIAIS DO SUPABASE (PROJETO: DICAS LGBT+)
const SUPABASE_URL = 'https://lhmryymkspwsvwogewes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobXJ5eW1rc3B3c3Z3b2dld2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODU0NDYsImV4cCI6MjA1NTk2MTQ0Nn0.74Z4Tf3R343oJylkU4eBv_aX2pGjW0m0MhF3W8gL11M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});