import { describe, it, expect } from 'vitest';
import { buildSeasonSummary, formatSeasonPeriod } from './seasonSummary';
import { makeGame, makePlayers, PLAYER_IDS } from '../test/fixtures';

const season = (extra = {}) => ({
  id: 's1', name: 'Август 2026', startDate: '2026-08-01', endDate: '2026-08-31', isActive: false,
  ratingThresholdType: 'none', ratingThresholdValue: 0, ...extra,
});

// Стандартная рассадка p1..p10: p1–p6 мирные, p7 шериф, p8–p9 мафия, p10 дон
const g = (id, winner, extra = {}) => makeGame({ id, winner, seasonId: 's1', ...extra });
const OTHERS = ['x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10'];

describe('buildSeasonSummary — цифры', () => {
  it('игры, вечера с играми, участники, победы', () => {
    const games = [
      g('g1', 'red', { tournamentId: 't1' }),
      g('g2', 'black', { tournamentId: 't1' }),
      g('g3', 'red', { tournamentId: 't2' }),
      g('g4', 'draw'),
    ];
    const tournaments = [{ id: 't1' }, { id: 't2' }, { id: 't3' /* без игр */ }];
    const { stats } = buildSeasonSummary({ season: season(), games, players: makePlayers(), tournaments });
    expect(stats).toEqual({
      games: 4, evenings: 2, players: 10,
      redWins: 2, blackWins: 1, draws: 1, redWinrate: 50, blackWinrate: 25,
    });
  });
});

describe('buildSeasonSummary — пьедестал', () => {
  it('по среднему баллу; полная ничья — по нику', () => {
    // p1: баллы 1.4 и 1.0 → ср. 1.2, доп. 0.2; p2: 1.2 и 1.2 → ср. 1.2, доп. 0.2 — ничья → по нику
    // p3..p7: ср. 1.0 → третьим идёт p3 (по нику)
    const games = [
      g('g1', 'red', { scores: { p1: { base: 1, bonus: 0.4 }, p2: { base: 1, bonus: 0.2 } } }),
      g('g2', 'red', { scores: { p1: { base: 1, bonus: 0 }, p2: { base: 1, bonus: 0.2 } } }),
    ];
    const { podium } = buildSeasonSummary({ season: season(), games, players: makePlayers() });
    expect(podium.map((p) => p.playerId)).toEqual(['p1', 'p2', 'p3']);
    expect(podium[0]).toMatchObject({ nickname: 'Игрок p1', avgScore: 1.2, avgBonus: 0.2, totalGames: 2, winrate: 100 });
  });

  it('равный средний балл — выше тот, у кого больше доп. балл', () => {
    // p1: 1.4 + 0.1 = 1.5; p2: 1.2 + 0.3 = 1.5 → p2 выше за счёт доп. балла
    const games = [
      g('g1', 'red', { scores: { p1: { base: 1.4, bonus: 0.1 }, p2: { base: 1.2, bonus: 0.3 } } }),
    ];
    const { podium } = buildSeasonSummary({ season: season(), games, players: makePlayers() });
    expect(podium.slice(0, 2).map((p) => p.playerId)).toEqual(['p2', 'p1']);
  });

  it('равенство с шумом округления: 0.1 + 0.2 против 0.3 — решает доп. балл', () => {
    // У всех, кроме p8 и p9, итог 0. p8: 0.1 + 0.2 = 0.30000000000000004, доп. 0.2;
    // p9: 0 + 0.3 = 0.3, доп. 0.3. «Сырой» средний балл у p8 больше на 4e-17,
    // но это равенство — выше p9 за счёт доп. балла.
    const zero = { base: 0, bonus: 0 };
    const scores = Object.fromEntries(PLAYER_IDS.map((id) => [id, zero]));
    const games = [g('g1', 'red', {
      scores: { ...scores, p8: { base: 0.1, bonus: 0.2 }, p9: { base: 0, bonus: 0.3 } },
    })];
    const { podium } = buildSeasonSummary({ season: season(), games, players: makePlayers() });
    expect(podium.slice(0, 2).map((p) => p.playerId)).toEqual(['p9', 'p8']);
  });

  it('порог сезона: не набравшие порог не попадают', () => {
    const extra = makeGame({
      id: 'g3', winner: 'red', seasonId: 's1',
      playerIds: ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'p7', 'p8', 'p9', 'p10'],
      scores: { x1: { base: 1, bonus: 3 } },
    });
    const games = [g('g1', 'red'), g('g2', 'red'), extra];
    const summary = buildSeasonSummary({
      season: season({ ratingThresholdType: 'absolute', ratingThresholdValue: 2 }),
      games, players: makePlayers([...PLAYER_IDS, 'x1', 'x2', 'x3', 'x4', 'x5', 'x6']),
    });
    expect(summary.threshold).toBe(2);
    expect(summary.podium.some((p) => p.playerId === 'x1')).toBe(false);
  });

  it('порог прошли двое — на пьедестале двое', () => {
    // По две игры только у p1 и p2; остальные — по одной
    const games = [g('g1', 'red'), g('g2', 'red', { playerIds: ['p1', 'p2', ...OTHERS] })];
    const summary = buildSeasonSummary({
      season: season({ ratingThresholdType: 'absolute', ratingThresholdValue: 2 }),
      games, players: makePlayers([...PLAYER_IDS, ...OTHERS]),
    });
    expect(summary.podium.map((p) => p.playerId)).toEqual(['p1', 'p2']);
  });

  it('порог не прошёл никто — пустой пьедестал и пустые номинации', () => {
    const games = [g('g1', 'red'), g('g2', 'red')];
    const summary = buildSeasonSummary({
      season: season({ ratingThresholdType: 'absolute', ratingThresholdValue: 5 }), games, players: makePlayers(),
    });
    expect(summary.podium).toEqual([]);
    expect(summary.nominations.every((n) => n.leader === null)).toBe(true);
  });

  it('игрока нет в списке игроков — ник «?»', () => {
    const games = [g('g1', 'red', { scores: { p1: { base: 1, bonus: 2 } } })];
    const players = makePlayers().filter((p) => p.id !== 'p1');
    expect(buildSeasonSummary({ season: season(), games, players }).podium[0]).toMatchObject({ playerId: 'p1', nickname: '?' });
  });
});

describe('buildSeasonSummary — номинации', () => {
  it('четыре роли по порядку, лидер по доп. баллу среди прошедших порог', () => {
    const games = [
      g('g1', 'red', { scores: { p7: { base: 1, bonus: 0.5 }, p10: { base: 0, bonus: 0.3 } } }),
      g('g2', 'red'),
    ];
    const { nominations } = buildSeasonSummary({ season: season(), games, players: makePlayers() });
    expect(nominations.map((n) => n.label)).toEqual(['Лучший красный', 'Лучший шериф', 'Лучший чёрный', 'Лучший дон']);
    expect(nominations[1].leader).toMatchObject({ playerId: 'p7', nickname: 'Игрок p7', avgBonus: 0.25, games: 2 });
    expect(nominations[3].leader).toMatchObject({ playerId: 'p10', avgBonus: 0.15 });
  });

  it('пустая роль — null', () => {
    const allCitizens = makeGame({ id: 'g1', seasonId: 's1', winner: 'red', roles: Array(10).fill('citizen') });
    const { nominations } = buildSeasonSummary({ season: season(), games: [allCitizens], players: makePlayers() });
    expect(nominations.find((n) => n.role === 'don').leader).toBe(null);
  });
});

describe('период', () => {
  it('завершённый сезон, без endDate, промежуточный, через Новый год', () => {
    const games = [g('g1', 'red', { date: '2026-08-20T19:00:00Z' })];
    const players = makePlayers();
    expect(buildSeasonSummary({ season: season(), games, players }).period).toBe('01.08–31.08.2026');
    expect(buildSeasonSummary({ season: season({ endDate: null }), games, players }).period).toBe('01.08–20.08.2026');

    const active = buildSeasonSummary({ season: season({ isActive: true }), games, players, today: new Date(2026, 8, 23) });
    expect(active).toMatchObject({ isInterim: true, period: 'промежуточные · на 23.09.2026' });

    expect(formatSeasonPeriod(new Date(2025, 11, 1), new Date(2026, 1, 28))).toBe('01.12.2025–28.02.2026');
  });
});
