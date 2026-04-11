import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase: Initializing with URL:', supabaseUrl);
// Don't log the full key, but log its length/presence
console.log('Supabase: Key length:', supabaseAnonKey?.length || 0);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase: credentials missing! Check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
