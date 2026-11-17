import { describe, it, expect } from 'vitest';
import { seasonStandings, placeOf, placeHistory, eveningSummary } from './standings';
import { makeGame, PLAYER_IDS } from '../test/fixtures';

// Стандартная рассадка: p1–p7 красные (p7 — шериф), p8–p10 чёрные.
// Победителю база 1, проигравшему 0.
const noThreshold = { ratingThresholdType: 'none' };
const day = (d, h = 19) => `2026-03-${String(d).padStart(2, '0')}T${h}:00:00Z`;

// Вечер 1: победа красных, у p1 доп. +0.5 → p1 лидер (1.5).
// Вечер 2: победа чёрных, у p8 доп. +1 → p8 средний 1, p1 — 0.75.
const g1 = makeGame({ id: 'g1', gameNumber: 1, date: day(1), winner: 'red', scores: { p1: { base: 1, bonus: 0.5 } } });
const g2 = makeGame({ id: 'g2', gameNumber: 2, date: day(2), winner: 'black', scores: { p8: { base: 1, bonus: 1 } } });
// Вечер 3: p1 не пришёл, вместо него p11
const g3 = makeGame({ id: 'g3', gameNumber: 3, date: day(3), winner: 'red', playerIds: ['p11', ...PLAYER_IDS.slice(1)] });

describe('seasonStandings', () => {
  it('по среднему баллу; при равенстве — больше игр выше', () => {
    const { ranked } = seasonStandings([g1, g2], noThreshold);
    expect(ranked.slice(0, 2).map((r) => r.id)).toEqual(['p8', 'p1']);
    const { ranked: r3 } = seasonStandings([g1, g2, g3], noThreshold);
    // p11 — одна игра со средним 1, p2 — три игры со средним 0.67: p11 выше
    expect(placeOf(r3, 'p11')).toBeLessThan(placeOf(r3, 'p2'));
  });

  it('порог: ниже порога — не в рейтинге, но в totals', () => {
    const season = { ratingThresholdType: 'absolute', ratingThresholdValue: 2 };
    const { ranked, totals, threshold } = seasonStandings([g1, g2, g3], season);
    expect(threshold).toBe(2);
    expect(placeOf(ranked, 'p11')).toBe(null);
    expect(totals.get('p11')).toMatchObject({ games: 1 });
  });
});

describe('placeHistory', () => {
  it('место после каждого вечера и был ли игрок в тот вечер', () => {
    expect(placeHistory('p1', [g3, g1, g2], noThreshold)).toEqual([
      { date: '2026-03-01', place: 1, rankedCount: 10, played: true },
      { date: '2026-03-02', place: 2, rankedCount: 10, played: true },
      { date: '2026-03-03', place: 2, rankedCount: 11, played: false },
    ]);
  });

  it('вечера до первой игры не включаются; две игры за вечер — одна точка', () => {
    const g3b = makeGame({ id: 'g3b', gameNumber: 4, date: day(3, 21), winner: 'red', playerIds: ['p11', ...PLAYER_IDS.slice(1)] });
    const history = placeHistory('p11', [g1, g2, g3, g3b], noThreshold);
    expect(history.map((h) => h.date)).toEqual(['2026-03-03']);
    expect(history[0]).toMatchObject({ place: 1, played: true });
  });

  it('порог считается по играм к тому вечеру', () => {
    // Порог — 2 игры: после вечера 1 у p1 одна игра (вне рейтинга), после вечера 2 — две
    const season = { ratingThresholdType: 'absolute', ratingThresholdValue: 2 };
    expect(placeHistory('p1', [g1, g2], season).map((h) => h.place)).toEqual([null, 2]);
  });
});

describe('eveningSummary', () => {
  it('место сейчас и до вечера, игры вечера, соседи', () => {
    const g2elo = { ...g2, players: g2.players.map((p) => (p.playerId === 'p1' ? { ...p, eloDelta: -12.5 } : p)) };
    const s = eveningSummary('p1', [g1, g2elo], noThreshold);
    expect(s).toMatchObject({
      date: '2026-03-02', place: 2, prevPlace: 1, firstEvening: false, rankedCount: 10, gamesToThreshold: 0,
      evening: { games: 1, wins: 0, score: 0, eloDelta: -12.5 },
      me: { games: 2, avgScore: 0.75 },
    });
    expect(s.above).toMatchObject({ id: 'p8', gap: 0.25 });
    expect(s.below.gap).toBeCloseTo(-0.25);
  });

  it('не играл в последний вечер — evening null, место есть', () => {
    const s = eveningSummary('p1', [g1, g2, g3], noThreshold);
    expect(s.evening).toBe(null);
    expect(s.place).toBe(2);
  });

  it('ниже порога — сколько игр не хватает, без соседей', () => {
    const season = { ratingThresholdType: 'absolute', ratingThresholdValue: 3 };
    const s = eveningSummary('p1', [g1, g2], season);
    expect(s).toMatchObject({ place: null, gamesToThreshold: 1, above: null, below: null });
  });

  it('первый вечер сезона — сравнивать не с чем', () => {
    const s = eveningSummary('p1', [g1], noThreshold);
    expect(s).toMatchObject({ firstEvening: true, prevPlace: null });
    expect(s.place).not.toBe(null);
  });

  it('не играл в сезоне вовсе и пустой сезон', () => {
    expect(eveningSummary('nobody', [g1], noThreshold)).toMatchObject({ me: null, place: null, gamesToThreshold: 0 });
    expect(eveningSummary('p1', [], noThreshold)).toBe(null);
  });
});
