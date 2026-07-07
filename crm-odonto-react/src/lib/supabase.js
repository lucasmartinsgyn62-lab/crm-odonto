import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

// Cliente secundário sem persistência de sessão — usado para criar usuários
// sem substituir a sessão do super-admin logado
export const supabaseSignup = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false, storageKey: 'crm-signup' }
});
