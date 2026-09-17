// Небольшие чистые модули: роутер, кэш данных, порядок игр, форматирование картинок.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { routeToHash, hashToRoute } from './router';
import { readDataCache, writeDataCache, pickDefaultSeasonId, seasonSlice } from './dataCache';
import { compareGamesDesc } from './utils';
import { fitText, formatNumber, formatDelta } from './shareImage/canvas';

describe('router', () => {
  const id = '3f2a0c1e-1111-2222-3333-444455556666';
  const routes = [
    ['dashboard', null, '#/'],
    ['games', null, '#/games'],
    ['gameForm', null, '#/games/new'],
    ['gameForm', id, `#/games/${id}/edit`],
    ['gameDetail', id, `#/games/${id}`],
    ['rating', null, '#/rating'],
    ['players', null, '#/players'],
    ['playerProfile', id, `#/players/${id}`],
    ['compare', null, '#/compare'],
    ['compare', id, `#/compare/${id}`],
    ['tournaments', null, '#/tournaments'],
    ['tournamentForm', null, '#/tournaments/new'],
    ['tournamentForm', id, `#/tournaments/${id}/edit`],
    ['tournamentDetail', id, `#/tournaments/${id}`],
    ['settings', null, '#/settings'],
  ];

  it.each(routes)('%s (%s) ⇄ %s', (page, pageId, hash) => {
    expect(routeToHash(page, pageId)).toBe(hash);
    expect(hashToRoute(hash)).toEqual({ page, id: pageId });
  });

  it('неизвестный адрес — дашборд', () => {
    expect(hashToRoute('')).toEqual({ page: 'dashboard', id: null });
    expect(hashToRoute('#/garbage/x/y')).toEqual({ page: 'dashboard', id: null });
    expect(routeToHash('unknown')).toBe('#/');
  });

  it('лишний слэш в конце не мешает', () => {
    expect(hashToRoute('#/games/')).toEqual({ page: 'games', id: null });
  });
});

describe('dataCache', () => {
  let store;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  const data = {
    seasons: [{ id: 's1', isActive: false }, { id: 's2', isActive: true }],
    players: [{ id: 'p1' }],
    allGames: [
      { id: 'g3', seasonId: 's2', gameNumber: 3 },
      { id: 'g1', seasonId: 's2', gameNumber: 1 },
      { id: 'g0', seasonId: 's1', gameNumber: 1 },
    ],
    allTournaments: [{ id: 't2', seasonId: 's2' }, { id: 't1', seasonId: 's1' }],
  };

  it('записанное читается обратно', () => {
    writeDataCache(data);
    expect(readDataCache()).toMatchObject({ version: 1, ...data });
  });

  it('нет кэша, битый JSON, другая версия или неполные данные — null', () => {
    expect(readDataCache()).toBeNull();
    store.set('ironmaf-data', '{oops');
    expect(readDataCache()).toBeNull();
    store.set('ironmaf-data', JSON.stringify({ ...data, version: 0 }));
    expect(readDataCache()).toBeNull();
    store.set('ironmaf-data', JSON.stringify({ version: 1, seasons: [] }));
    expect(readDataCache()).toBeNull();
  });

  it('недоступный localStorage не ломает приложение', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
    });
    expect(readDataCache()).toBeNull();
    expect(() => writeDataCache(data)).not.toThrow();
  });

  it('сезон по умолчанию — активный, иначе последний в списке', () => {
    expect(pickDefaultSeasonId(data.seasons)).toBe('s2');
    expect(pickDefaultSeasonId([{ id: 'a' }, { id: 'b' }])).toBe('b');
    expect(pickDefaultSeasonId([])).toBeNull();
  });

  it('данные сезона — игры по номеру, турниры в исходном порядке', () => {
    const slice = seasonSlice(data, 's2');
    expect(slice.games.map((g) => g.id)).toEqual(['g1', 'g3']);
    expect(slice.tournaments.map((t) => t.id)).toEqual(['t2']);
    expect(seasonSlice(data, null)).toEqual({ games: [], tournaments: [] });
  });

  it('не меняет порядок исходного списка игр', () => {
    seasonSlice(data, 's2');
    expect(data.allGames.map((g) => g.id)).toEqual(['g3', 'g1', 'g0']);
  });
});

describe('compareGamesDesc', () => {
  it('новые даты первыми, время не учитывается, при равной дате — больший номер первым', () => {
    const games = [
      { id: 'a', date: '2026-01-01T23:00:00Z', gameNumber: 1 },
      { id: 'b', date: '2026-01-01T08:00:00Z', gameNumber: 2 },
      { id: 'c', date: '2026-01-02T08:00:00Z', gameNumber: 1 },
    ];
    expect(games.sort(compareGamesDesc).map((g) => g.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('форматирование на картинках', () => {
  it('баллы всегда с двумя знаками, отрицательные — с настоящим минусом', () => {
    expect(formatNumber(1.5)).toBe('1.50');
    expect(formatNumber(0)).toBe('0.00');
    expect(formatNumber(-0.125)).toBe('−0.13');
    expect(formatNumber(-0.001)).toBe('0.00');
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(NaN)).toBe('—');
  });

  it('изменение ELO — целое со знаком', () => {
    expect(formatDelta(12.4)).toBe('+12');
    expect(formatDelta(-7.6)).toBe('−8');
    expect(formatDelta(0.3)).toBe('0');
    expect(formatDelta(null)).toBe('—');
  });

  // ширина текста = 10 px на символ
  const ctx = { measureText: (text) => ({ width: text.length * 10 }) };

  it('fitText не трогает влезающий текст', () => {
    expect(fitText(ctx, 'Короткий', 100)).toBe('Короткий');
    expect(fitText(ctx, 'Без ограничения', undefined)).toBe('Без ограничения');
  });

  it('fitText обрезает с многоточием по ширине и убирает пробел перед ним', () => {
    expect(fitText(ctx, 'Очень длинный ник', 80)).toBe('Очень д…');
    expect(fitText(ctx, 'Очень длинный ник', 70)).toBe('Очень…');
  });
});
