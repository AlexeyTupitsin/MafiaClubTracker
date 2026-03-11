import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Store current access token for REST queries (updated by useAuth)
let currentAccessToken = null;

export function setAccessToken(token) {
  currentAccessToken = token;
}

export function getAccessToken() {
  return currentAccessToken || supabaseAnonKey;
}
