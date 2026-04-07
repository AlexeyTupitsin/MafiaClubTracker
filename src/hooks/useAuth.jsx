import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, setAccessToken } from '../lib/supabase';
import { logAuthEvent } from '../lib/auditLog';

const AuthContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchProfile(userId, token) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef(null);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        const token = session?.access_token || null;

        if (event === 'SIGNED_IN' && currentUser) {
          logAuthEvent(currentUser.id, 'auth.login');
        } else if (event === 'SIGNED_OUT') {
          // При SIGNED_OUT session уже пуст — берём userId из ref
          logAuthEvent(prevUserIdRef.current, 'auth.logout');
        }
        prevUserIdRef.current = currentUser?.id ?? null;

        setUser(currentUser);
        setAccessToken(token);

        if (currentUser && token) {
          const profile = await fetchProfile(currentUser.id, token);
          setIsAdmin(profile?.role === 'admin');
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    // Also try to get initial session (may hang in some supabase-js versions)
    // Use a timeout fallback
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      const currentUser = session?.user || null;
      const token = session?.access_token || null;

      setUser(currentUser);
      setAccessToken(token);

      if (currentUser && token) {
        fetchProfile(currentUser.id, token).then((profile) => {
          setIsAdmin(profile?.role === 'admin');
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(login, password) {
    const email = `${login.toLowerCase().trim()}@mafia.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
