import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, setAccessToken, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

const AuthContext = createContext(null);

const PROFILE_TIMEOUT_MS = 10_000;

// Тот же адрес, что у остальных запросов: при включённом прокси профиль
// раньше запрашивался напрямую, падал, и админ молча становился зрителем
async function fetchProfile(userId, token) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`,
      {
        signal: AbortSignal.timeout(PROFILE_TIMEOUT_MS),
        headers: {
          'apikey': SUPABASE_ANON_KEY,
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

  useEffect(() => {
    // Колбэк синхронный, а запрос профиля отложен: supabase-js вызывает
    // колбэк под своей блокировкой, и пока он ждёт (await), стоят все
    // остальные вызовы auth — getSession, refreshSession, signOut.
    // Supabase прямо советует не делать в нём await.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user || null;
        const token = session?.access_token || null;

        setUser(currentUser);
        setAccessToken(token);

        if (currentUser && token) {
          setTimeout(() => {
            fetchProfile(currentUser.id, token).then((profile) => {
              setIsAdmin(profile?.role === 'admin');
              setLoading(false);
            });
          }, 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
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

// Провайдер и хук живут вместе — Fast Refresh для этого файла не критичен
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
