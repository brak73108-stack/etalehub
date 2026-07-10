import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a singleton client. 
// If env vars are missing, we log a warning but don't crash, 
// allowing Demo Mode to operate independently.
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('[EtaleHub] Supabase URL or Anon Key missing. Production mode unavailable. Operating in Demo Mode only.');
}

export { supabase };
