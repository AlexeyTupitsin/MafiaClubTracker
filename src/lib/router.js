// Страница приложения ⇄ hash-адрес (#/players/<id>).
// Hash, а не путь: не нужны rewrite-правила на Vercel, и F5 работает везде.
// После «?» — состояние страницы (фильтры, сортировка): #/games?player=<id>.
// Оно переживает «назад», F5 и пересылку ссылки.

const ROUTES = [
  // [страница, шаблон]; :id — идентификатор записи.
  // Литералы (games/new) идут раньше шаблонов с :id (games/:id).
  ['dashboard', ''],
  ['games', 'games'],
  ['gameForm', 'games/new'],
  ['gameForm', 'games/:id/edit'],
  ['gameDetail', 'games/:id'],
  ['rating', 'rating'],
  ['players', 'players'],
  ['playerProfile', 'players/:id'],
  ['compare', 'compare'],
  ['compare', 'compare/:id'],
  ['tournaments', 'tournaments'],
  ['tournamentForm', 'tournaments/new'],
  ['tournamentForm', 'tournaments/:id/edit'],
  ['tournamentDetail', 'tournaments/:id'],
  ['stats', 'stats'],
  ['settings', 'settings'],
];

export function routeToHash(page, id = null) {
  const route = ROUTES.find(([p, pattern]) => p === page && pattern.includes(':id') === Boolean(id));
  if (!route) return '#/';
  return `#/${route[1].replace(':id', encodeURIComponent(id ?? ''))}`;
}

export function hashToRoute(hash) {
  const parts = splitHash(hash).path.replace(/^#\/?/, '').split('/').filter(Boolean);
  for (const [page, pattern] of ROUTES) {
    const tpl = pattern.split('/').filter(Boolean);
    if (tpl.length !== parts.length) continue;

    let id = null;
    const matches = tpl.every((seg, i) => {
      if (seg !== ':id') return seg === parts[i];
      id = decodeURIComponent(parts[i]);
      return true;
    });
    if (matches) return { page, id };
  }
  return { page: 'dashboard', id: null };
}

function splitHash(hash) {
  const i = hash.indexOf('?');
  return i === -1 ? { path: hash, query: '' } : { path: hash.slice(0, i), query: hash.slice(i + 1) };
}

/** Часть адреса после «?» вместе с ним ('' — параметров нет). */
export function hashQuery(hash) {
  const { query } = splitHash(hash);
  return query ? `?${query}` : '';
}

/** Адрес без параметров: '#/games?x=1' → '#/games'. */
export function hashPath(hash) {
  return splitHash(hash).path;
}

/** Значение параметра страницы; null — не задан. */
export function getHashParam(hash, key) {
  return new URLSearchParams(splitHash(hash).query).get(key);
}

/** Тот же адрес с изменённым параметром; null/'' — убрать параметр. */
export function setHashParam(hash, key, value) {
  const { path, query } = splitHash(hash);
  const params = new URLSearchParams(query);
  if (value == null || value === '') params.delete(key);
  else params.set(key, String(value));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
