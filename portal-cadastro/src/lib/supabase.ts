import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fyisfucgzpdwupjterlh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qSAiGoo7ZEG0IboqClunQ_NyJ80';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
