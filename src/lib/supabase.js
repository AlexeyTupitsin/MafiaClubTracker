import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseProxyPath = import.meta.env.VITE_SUPABASE_PROXY_URL;

const clientUrl = supabaseProxyPath
  ? `${window.location.origin}${supabaseProxyPath}`
  : supabaseUrl;

export const supabase = createClient(clientUrl, supabaseAnonKey);

// Store current access token for REST queries (updated by useAuth)
let currentAccessToken = null;

export function setAccessToken(token) {
  currentAccessToken = token;
}

export function getAccessToken() {
  return currentAccessToken || supabaseAnonKey;
}
