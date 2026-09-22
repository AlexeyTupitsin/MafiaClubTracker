import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSupabase, hasStoredSession, setAccessToken, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

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
  // Загружает supabase-js и подписывается на смену сессии (один раз)
  const connectRef = useRef(null);

  useEffect(() => {
    let active = true;
    let subscription = null;

    const applySession = (session) => {
      if (!active) return;
      const currentUser = session?.user || null;
      const token = session?.access_token || null;

      setUser(currentUser);
      setAccessToken(token);

      if (currentUser && token) {
        fetchProfile(currentUser.id, token).then((profile) => {
          if (!active) return;
          setIsAdmin(profile?.role === 'admin');
          setLoading(false);
        });
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };

    let connecting = null;
    connectRef.current = () => {
      if (!connecting) {
        connecting = getSupabase().then((supabase) => {
          if (active && !subscription) {
            // Колбэк синхронный, а запрос профиля отложен: supabase-js вызывает
            // колбэк под своей блокировкой, и пока он ждёт (await), стоят все
            // остальные вызовы auth — getSession, refreshSession, signOut.
            // Supabase прямо советует не делать в нём await.
            ({ data: { subscription } } = supabase.auth.onAuthStateChange(
              (event, session) => { setTimeout(() => applySession(session), 0); }
            ));
          }
          return supabase;
        });
        connecting.catch(() => { connecting = null; });
      }
      return connecting;
    };

    // Зритель без сохранённой сессии: supabase-js не нужен
    if (!hasStoredSession()) {
      setLoading(false);
      return () => { active = false; };
    }

    // getSession у некоторых версий supabase-js подвисал — не ждём дольше 3 с
    const timeout = setTimeout(() => { if (active) setLoading(false); }, 3000);
    connectRef.current()
      .then((supabase) => supabase.auth.getSession())
      .then(({ data: { session } }) => applySession(session))
      .catch(() => { if (active) setLoading(false); })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  async function signIn(login, password) {
    const email = `${login.toLowerCase().trim()}@mafia.local`;
    try {
      const supabase = await connectRef.current();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error };
    }
  }

  async function signOut() {
    const supabase = await connectRef.current();
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
