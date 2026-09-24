import { describe, it, expect } from 'vitest';
import { buildRatingRows, ratingToCsv } from './ratingCsv';
import { makeGame, makePlayers, PLAYER_IDS } from '../test/fixtures';

const season = (extra = {}) => ({
  id: 's1', name: 'Август 2026', trackFirstKill: false,
  ratingThresholdType: 'absolute', ratingThresholdValue: 2, ...extra,
});
const OTHERS = ['x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10'];

describe('buildRatingRows', () => {
  // p1 и p2 сыграли по две игры, остальные — по одной
  const games = [
    makeGame({ id: 'g1', scores: { p1: { base: 1, bonus: 0.4 }, p2: { base: 1, bonus: 0.2 } } }),
    makeGame({ id: 'g2', playerIds: ['p1', 'p2', ...OTHERS], scores: { p1: { base: 1, bonus: 0 }, p2: { base: 1, bonus: 0.2 } } }),
  ];
  const players = makePlayers([...PLAYER_IDS, ...OTHERS]);

  it('прошедшие порог — сверху с местами; при равенстве ср. балла и доп. балла — по нику', () => {
    const rows = buildRatingRows({ games, players, seasons: [season()], season: season() });
    expect(rows.slice(0, 2)).toMatchObject([
      { rank: 1, playerId: 'p1', nickname: 'Игрок p1', totalGames: 2, avgScore: 1.2, avgBonus: 0.2, inRating: true },
      { rank: 2, playerId: 'p2', inRating: true },
    ]);
  });

  it('не прошедшие порог — ниже, без места, в том же порядке', () => {
    const rows = buildRatingRows({ games, players, seasons: [season()], season: season() });
    const below = rows.slice(2);
    expect(below).toHaveLength(16);
    expect(below.every((r) => r.rank === null && r.inRating === false)).toBe(true);
    expect(below[0].avgScore).toBeGreaterThanOrEqual(below.at(-1).avgScore);
  });

  it('«Все сезоны» (season = null) — без порога, места у всех', () => {
    const rows = buildRatingRows({ games, players, seasons: [season()], season: null });
    expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1));
    expect(rows.every((r) => r.inRating)).toBe(true);
  });

  it('ELO текущий, изменение ELO — сумма за период, ПУ% — если сезон ведёт первое убийство', () => {
    const g = makeGame({ id: 'g1', firstKilled: 'p1' });
    g.players.forEach((p) => { p.eloDelta = 5; });
    const withElo = makePlayers().map((p) => ({ ...p, elo: p.id === 'p1' ? 1034.6 : null }));

    const tracked = season({ trackFirstKill: true, ratingThresholdType: 'none' });
    const p1 = buildRatingRows({ games: [g], players: withElo, seasons: [tracked], season: tracked })
      .find((r) => r.playerId === 'p1');
    expect(p1).toMatchObject({ elo: 1034.6, eloDelta: 5, killRate: 100 });

    const untracked = season({ ratingThresholdType: 'none' });
    const p2 = buildRatingRows({ games: [g], players: withElo, seasons: [untracked], season: untracked })
      .find((r) => r.playerId === 'p2');
    expect(p2).toMatchObject({ elo: null, killRate: null });
  });

  it('игрока нет в списке игроков — ник «?»', () => {
    const rows = buildRatingRows({ games: [makeGame()], players: [], seasons: [], season: null });
    expect(rows.every((r) => r.nickname === '?')).toBe(true);
  });
});

describe('ratingToCsv', () => {
  const HEADER = '#;Ник;Игры;Победы;WR%;Баллы;Ср. балл;Ср. доп.;ELO;Изм. ELO;ПУ%;В рейтинге';
  const row = (extra = {}) => ({
    rank: 1, nickname: 'Blondie', totalGames: 10, wins: 7, winrate: 70, totalScore: 8.4,
    avgScore: 0.84, avgBonus: 0.14, elo: 939.6, eloDelta: -12.4, killRate: 10, inRating: true, ...extra,
  });
  const line = (r) => ratingToCsv([r]).split('\r\n')[1];

  it('BOM, заголовок, строки через CRLF; «;» и запятая в дробных — под русский Excel', () => {
    expect(ratingToCsv([row()])).toBe(`\uFEFF${HEADER}\r\n1;Blondie;10;7;70;8,4;0,84;0,14;940;-12;10,0;да\r\n`);
  });

  it('точность как в таблице: WR% целым, целые баллы без дроби, минус без «-0,00»', () => {
    expect(line(row({ winrate: 58.33, totalScore: 9, avgBonus: -0.004, eloDelta: 0 })))
      .toBe('1;Blondie;10;7;58;9;0,84;0,00;940;0;10,0;да');
    expect(line(row({ avgBonus: -0.12 }))).toContain(';-0,12;');
  });

  it('ниже порога и пустые значения — пустые ячейки', () => {
    expect(line(row({ rank: null, elo: null, killRate: null, inRating: false })))
      .toBe(';Blondie;10;7;70;8,4;0,84;0,14;;-12;;ниже порога');
  });

  it('ник с «;» и кавычками — в кавычках; начало с = + - @ — апостроф, чтобы Excel не счёл формулой', () => {
    expect(line(row({ nickname: 'A;B' }))).toMatch(/^1;"A;B";/);
    expect(line(row({ nickname: 'Say "hi"' }))).toMatch(/^1;"Say ""hi""";/);
    expect(line(row({ nickname: '=SUM(1)' }))).toMatch(/^1;'=SUM\(1\);/);
    expect(line(row({ nickname: '-Kate' }))).toMatch(/^1;'-Kate;/);
    expect(line(row({ nickname: '@a;b' }))).toMatch(/^1;"'@a;b";/);
  });

  it('пустой список — только заголовок', () => {
    expect(ratingToCsv([])).toBe(`\uFEFF${HEADER}\r\n`);
  });
});
