import { describe, it, expect } from 'vitest';
import {
  calcPlayerStats, calcSeasonStats, calcRoleStats, calcPairStats, calcThreshold,
  calcExtendedNominations, calcFormTrend, calcKillRate, calcRoleKillRate, calcBestMoveStats,
} from './metrics';
import { makeGame, makePlayers, LINEUP_ROLES } from '../test/fixtures';

// p1 — мирный, p7 — шериф, p8/p9 — мафия, p10 — дон (стандартная рассадка)
const games = [
  makeGame({ id: 'g1', gameNumber: 1, winner: 'red', scores: { p1: { base: 1, bonus: 0.5 } } }),
  makeGame({ id: 'g2', gameNumber: 2, winner: 'black', scores: { p8: { base: 1, bonus: 0.3 } } }),
  makeGame({ id: 'g3', gameNumber: 3, winner: 'draw' }),
];

describe('calcPlayerStats', () => {
  it('считает игры, результаты и средние', () => {
    const stats = calcPlayerStats('p1', games);
    expect(stats).toMatchObject({
      totalGames: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      totalScore: 1.5,
      avgScore: 0.5,
      totalBonus: 0.5,
    });
    expect(stats.winrate).toBeCloseTo(100 / 3);
    expect(stats.avgBonus).toBeCloseTo(0.5 / 3);
  });

  it('игрок без игр — нули, без деления на ноль', () => {
    expect(calcPlayerStats('nobody', games)).toMatchObject({
      totalGames: 0, winrate: 0, avgScore: 0, avgBonus: 0,
    });
  });
});

describe('calcSeasonStats', () => {
  it('победы команд и средний балл за место', () => {
    const stats = calcSeasonStats(games);
    expect(stats).toMatchObject({ totalGames: 3, redWins: 1, blackWins: 1, draws: 1 });
    expect(stats.redWinrate).toBeCloseTo(100 / 3);
    // g1: 7 × 1 + 0.5; g2: 3 × 1 + 0.3; g3: 0 → 10.8 на 30 мест
    expect(stats.avgScore).toBeCloseTo(10.8 / 30);
  });

  it('пустой сезон', () => {
    expect(calcSeasonStats([])).toMatchObject({ totalGames: 0, redWinrate: 0, avgScore: 0 });
  });
});

describe('calcRoleStats', () => {
  it('по всем четырём ролям, включая несыгранные', () => {
    const stats = calcRoleStats('p1', games);
    expect(stats.map((s) => s.role)).toEqual(['citizen', 'sheriff', 'mafia', 'don']);
    expect(stats[0]).toMatchObject({ games: 3, wins: 1, avgScore: 0.5 });
    expect(stats[1]).toMatchObject({ games: 0, winrate: 0, avgScore: 0 });
  });
});

describe('calcPairStats', () => {
  // во второй игре p1 и p8 меняются ролями
  const swapped = [...LINEUP_ROLES];
  [swapped[0], swapped[7]] = [swapped[7], swapped[0]];
  const pairGames = [
    makeGame({ id: 'a', winner: 'red' }),                   // p1 красный, p2 красный, p8 чёрный
    makeGame({ id: 'b', winner: 'black', roles: swapped }), // p1 чёрный, p8 красный
    makeGame({ id: 'c', winner: 'red', playerIds: ['p1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10'] }),
  ];

  it('только общие игры, по сочетаниям команд', () => {
    const pair = calcPairStats('p1', 'p8', pairGames);
    expect(pair.totalGames).toBe(2);
    expect(pair.aRedBBlack).toEqual({ games: 1, winsA: 1, winrateA: 100 });
    expect(pair.aBlackBRed).toEqual({ games: 1, winsA: 1, winrateA: 100 });
    expect(pair.bothRed.games).toBe(0);
  });

  it('оба в одной команде', () => {
    const pair = calcPairStats('p1', 'p2', pairGames);
    expect(pair.bothRed).toEqual({ games: 1, wins: 1, winrate: 100 });
  });
});

describe('calcThreshold', () => {
  it('без сезона или без порога — 0', () => {
    expect(calcThreshold(null, 50)).toBe(0);
    expect(calcThreshold({ ratingThresholdType: 'none', ratingThresholdValue: 10 }, 50)).toBe(0);
  });

  it('абсолютный порог', () => {
    expect(calcThreshold({ ratingThresholdType: 'absolute', ratingThresholdValue: 10 }, 50)).toBe(10);
  });

  it('процент от игр сезона округляется вниз', () => {
    expect(calcThreshold({ ratingThresholdType: 'percent', ratingThresholdValue: 30 }, 25)).toBe(7);
  });
});

describe('calcExtendedNominations', () => {
  it('по каждой роли — только сыгравшие её, по убыванию среднего доп. балла', () => {
    const { nominations } = calcExtendedNominations(games, makePlayers());
    expect(nominations.citizen[0].playerId).toBe('p1');
    expect(nominations.citizen).toHaveLength(6);
    expect(nominations.mafia[0]).toMatchObject({ playerId: 'p8', games: 3 });
    expect(nominations.mafia[0].avgBonus).toBeCloseTo(0.1);
    expect(nominations.don.map((n) => n.playerId)).toEqual(['p10']);
  });
});

describe('calcFormTrend', () => {
  const series = (winners) => winners.map((winner, i) => makeGame({
    id: `t${i}`, gameNumber: i + 1, date: `2026-01-${String(i + 1).padStart(2, '0')}T19:00:00Z`, winner,
  }));

  it('на подъёме, если последние игры лучше общего винрейта больше чем на 10 п.п.', () => {
    const trend = calcFormTrend('p1', series(['black', 'black', 'black', 'red', 'red']), 2);
    expect(trend.trend).toBe('up');
    expect(trend.recentResults).toEqual(['win', 'win']);
    expect(trend.diff).toBeCloseTo(60);
  });

  it('в спаде и стабильно', () => {
    expect(calcFormTrend('p1', series(['red', 'red', 'red', 'black', 'black']), 2).trend).toBe('down');
    expect(calcFormTrend('p1', series(['red', 'black', 'red', 'black']), 2).trend).toBe('stable');
  });

  it('берёт последние игры по хронологии, а не по порядку в массиве', () => {
    const trend = calcFormTrend('p1', series(['black', 'red']).reverse(), 1);
    expect(trend.recentResults).toEqual(['win']);
  });

  it('нет игр — null', () => {
    expect(calcFormTrend('p1', [])).toBeNull();
  });
});

describe('calcKillRate и calcRoleKillRate', () => {
  const seasons = [
    { id: 'tracked', trackFirstKill: true },
    { id: 'untracked', trackFirstKill: false },
  ];
  const killGames = [
    makeGame({ id: 'k1', seasonId: 'tracked', firstKilled: 'p1' }),
    makeGame({ id: 'k2', seasonId: 'tracked', firstKilled: 'p2' }),
    makeGame({ id: 'k3', seasonId: 'untracked', firstKilled: 'p1' }),
  ];

  it('учитывает только сезоны с отслеживанием первого убийства', () => {
    expect(calcKillRate('p1', killGames, seasons)).toEqual({
      gamesTracked: 2, timesKilled: 1, killRate: 50,
    });
  });

  it('нет отслеживаемых игр — null', () => {
    expect(calcKillRate('p1', killGames, [])).toBeNull();
  });

  it('по ролям: несыгранная роль — killRate null', () => {
    const byRole = calcRoleKillRate('p1', killGames, seasons);
    expect(byRole[0]).toEqual({ role: 'citizen', gamesTracked: 2, timesKilled: 1, killRate: 50 });
    expect(byRole[2]).toEqual({ role: 'mafia', killRate: null });
  });
});

describe('calcBestMoveStats', () => {
  it('считает, сколько чёрных угадано в лучшем ходе', () => {
    // чёрные сидят на местах 8, 9, 10
    const moves = [
      makeGame({ id: 'm1', firstKilled: 'p1', bestMoveSeat1: 8, bestMoveSeat2: 9, bestMoveSeat3: 10 }),
      makeGame({ id: 'm2', firstKilled: 'p1', bestMoveSeat1: 8, bestMoveSeat2: 2, bestMoveSeat3: null }),
      makeGame({ id: 'm3', firstKilled: 'p1', bestMoveSeat1: 2, bestMoveSeat2: null, bestMoveSeat3: null }),
      makeGame({ id: 'm4', firstKilled: 'p1' }),                   // без лучшего хода
      makeGame({ id: 'm5', firstKilled: 'p2', bestMoveSeat1: 8 }), // убит другой игрок
    ];
    expect(calcBestMoveStats('p1', moves)).toEqual({ total: 3, hits: { 0: 1, 1: 1, 2: 0, 3: 1 } });
  });
});
