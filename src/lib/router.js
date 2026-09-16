// Страница приложения ⇄ hash-адрес (#/players/<id>).
// Hash, а не путь: не нужны rewrite-правила на Vercel, и F5 работает везде.

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
  ['settings', 'settings'],
];

export function routeToHash(page, id = null) {
  const route = ROUTES.find(([p, pattern]) => p === page && pattern.includes(':id') === Boolean(id));
  if (!route) return '#/';
  return `#/${route[1].replace(':id', encodeURIComponent(id ?? ''))}`;
}

export function hashToRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
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
