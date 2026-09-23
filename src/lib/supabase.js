const supabaseProxy = import.meta.env.VITE_SUPABASE_PROXY_URL;

// Адрес Supabase для всех запросов — auth, REST, storage. Прокси задаётся
// путём на своём домене (/supabase-proxy, см. vercel.json) или полным URL.
export const SUPABASE_URL = !supabaseProxy
  ? import.meta.env.VITE_SUPABASE_URL
  : /^https?:\/\//.test(supabaseProxy) ? supabaseProxy : `${window.location.origin}${supabaseProxy}`;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// supabase-js нужен только для входа (данные идут через REST в queries.js),
// а зрители не входят. Поэтому клиент (~46 КБ gzip) грузится лениво: при
// сохранённой сессии или когда пользователь начинает вход.
let clientPromise = null;

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
      .catch((err) => {
        clientPromise = null; // дать повторить, например после обрыва сети
        throw err;
      });
  }
  return clientPromise;
}

// Есть ли сохранённая сессия supabase-js (ключ sb-<проект>-auth-token).
// Нет — значит зритель: клиент можно не загружать.
export function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (/^sb-.+-auth-token$/.test(localStorage.key(i))) return true;
    }
  } catch {
    // localStorage недоступен — supabase-js сессию тоже не сохранил бы
  }
  return false;
}

// Store current access token for REST queries (updated by useAuth)
let currentAccessToken = null;

export function setAccessToken(token) {
  currentAccessToken = token;
}

export function getAccessToken() {
  return currentAccessToken || SUPABASE_ANON_KEY;
}

export function hasUserSession() {
  return currentAccessToken !== null;
}

// Секунды до истечения JWT; null, если токен не разобрать
function secondsUntilExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp - Date.now() / 1000;
  } catch {
    return null;
  }
}

// Токен протухнет в ближайшие полминуты (или уже протух).
// Автообновление supabase-js работает по таймеру, а таймеры в фоновой
// вкладке и на уснувшем телефоне тормозятся — поэтому проверяем сами.
export function isAccessTokenExpiring() {
  if (!currentAccessToken) return false;
  const left = secondsUntilExpiry(currentAccessToken);
  return left !== null && left < 30;
}

const REFRESH_TIMEOUT_MS = 8000;
let refreshPromise = null;

/**
 * Обновляет сессию и возвращает новый access token (или null при неудаче).
 * Параллельные вызовы делят один запрос. Таймаут — потому что supabase-js
 * у нас бывает подвисает.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS));
    const refresh = getSupabase()
      .then((supabase) => supabase.auth.refreshSession())
      .then(({ data, error }) => {
        if (error || !data?.session) return null;
        setAccessToken(data.session.access_token);
        return data.session.access_token;
      })
      .catch(() => null);

    refreshPromise = Promise.race([refresh, timeout]).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
