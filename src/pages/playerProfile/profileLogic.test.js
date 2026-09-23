import { describe, it, expect } from 'vitest';
import {
  gamesForPeriod, recentTournamentStats, partnerStats, eloSummary, playerGameHistory,
  fmtScore, fmtWr, fmtPairCell,
} from './profileLogic';
import { makeGame, makePlayers } from '../../test/fixtures';

// p1 — мирный: побеждает, когда выигрывают красные
const g1 = makeGame({ id: 'g1', seasonId: 's1', gameNumber: 1, date: '2026-01-01T19:00:00Z', winner: 'red', tournamentId: 't1' });
const g2 = makeGame({ id: 'g2', seasonId: 's1', gameNumber: 2, date: '2026-01-02T19:00:00Z', winner: 'black', tournamentId: 't1' });
const g3 = makeGame({ id: 'g3', seasonId: 's2', gameNumber: 1, date: '2026-02-01T19:00:00Z', winner: 'red', tournamentId: 't2' });
const games = [g1, g2, g3];

describe('gamesForPeriod', () => {
  it('все сезоны или один', () => {
    expect(gamesForPeriod('all', games)).toBe(games);
    expect(gamesForPeriod('s1', games).map((g) => g.id)).toEqual(['g1', 'g2']);
  });
});

describe('recentTournamentStats', () => {
  const tournaments = [
    { id: 't1', name: 'Январь', date: '2026-01-01' },
    { id: 't2', name: 'Февраль', date: '2026-02-01' },
    { id: 't3', name: 'Без игрока', date: '2026-03-01' },
  ];

  it('только турниры с играми игрока, новые первыми', () => {
    const stats = recentTournamentStats('p1', tournaments, games);
    expect(stats.map((t) => t.id)).toEqual(['t2', 't1']);
    expect(stats[1]).toMatchObject({ games: 2, wins: 1, winrate: 50, totalScore: 1, avgScore: 0.5 });
  });

  it('не больше limit и пусто без турниров', () => {
    expect(recentTournamentStats('p1', tournaments, games, 1)).toHaveLength(1);
    expect(recentTournamentStats('p1', [], games)).toEqual([]);
    expect(recentTournamentStats('p1', undefined, games)).toEqual([]);
  });
});

describe('partnerStats', () => {
  it('все партнёры по убыванию совместных игр, ник по id', () => {
    const extra = makeGame({ id: 'g4', playerIds: ['p1', 'p2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10'] });
    const partners = partnerStats('p1', [...games, extra], makePlayers());
    expect(partners[0]).toMatchObject({ id: 'p2', nickname: 'Игрок p2', totalGames: 4 });
    expect(partners.find((p) => p.id === 'x3')).toMatchObject({ nickname: '?', totalGames: 1 });
    expect(partners.some((p) => p.id === 'p1')).toBe(false);
  });
});

describe('eloSummary', () => {
  it('текущий, изменение за последние N, пик', () => {
    const history = [
      { eloBefore: 1000, eloAfter: 1010 },
      { eloBefore: 1010, eloAfter: 1030.4 },
      { eloBefore: 1030.4, eloAfter: 1020.6 },
    ];
    expect(eloSummary(history, 2)).toEqual({ current: 1021, recentCount: 2, recentDelta: 11, peak: 1030 });
    expect(eloSummary([])).toBe(null);
  });
});

describe('playerGameHistory', () => {
  it('игры игрока, новые первыми, с его записью', () => {
    const history = playerGameHistory('p7', games);
    expect(history.map((h) => h.game.id)).toEqual(['g3', 'g2', 'g1']);
    expect(history[0]).toMatchObject({ role: 'sheriff', result: 'win', seat: 7 });
  });
});

describe('форматирование', () => {
  it('баллы, winrate, ячейка пары', () => {
    expect(fmtScore(3)).toBe(3);
    expect(fmtScore(2.45)).toBe('2.5');
    expect(fmtWr(66.6)).toBe('67%');
    expect(fmtPairCell(3, 2, 66.6)).toBe('3 / 2 (67%)');
    expect(fmtPairCell(0, 0, 0)).toBe('—');
  });
});
