import { describe, it, expect } from 'vitest';
import { clubOverview, monthlyActivity, teamBalanceBySeason, roleWinrates, mostActive, newcomers } from './clubStats';
import { makeGame, makePlayers, PLAYER_IDS } from '../test/fixtures';

const others = ['p11', ...PLAYER_IDS.slice(1)]; // p11 вместо p1
const games = [
  makeGame({ id: 'a', seasonId: 's1', gameNumber: 1, date: '2026-01-10T18:00:00Z', winner: 'red' }),
  makeGame({ id: 'b', seasonId: 's1', gameNumber: 2, date: '2026-01-10T20:00:00Z', winner: 'black' }),
  makeGame({ id: 'c', seasonId: 's2', gameNumber: 1, date: '2026-03-05T19:00:00Z', winner: 'draw', playerIds: others }),
];
const seasons = [{ id: 's2', name: 'Весна' }, { id: 's1', name: 'Зима' }];
const players = makePlayers([...PLAYER_IDS, 'p11']);

describe('clubOverview', () => {
  it('игры, вечера, игроки, игр за вечер', () => {
    expect(clubOverview(games)).toEqual({ games: 3, evenings: 2, players: 11, gamesPerEvening: 1.5 });
    expect(clubOverview([])).toEqual({ games: 0, evenings: 0, players: 0, gamesPerEvening: 0 });
  });
});

describe('monthlyActivity', () => {
  it('месяцы без пропусков, пустой — нули', () => {
    expect(monthlyActivity(games)).toEqual([
      { month: '2026-01', games: 2, evenings: 1 },
      { month: '2026-02', games: 0, evenings: 0 },
      { month: '2026-03', games: 1, evenings: 1 },
    ]);
  });

  it('переход через год', () => {
    const g = [
      makeGame({ id: 'x', date: '2025-12-20T19:00:00Z' }),
      makeGame({ id: 'y', date: '2026-01-03T19:00:00Z' }),
    ];
    expect(monthlyActivity(g).map((m) => m.month)).toEqual(['2025-12', '2026-01']);
    expect(monthlyActivity([])).toEqual([]);
  });
});

describe('teamBalanceBySeason', () => {
  it('от старых сезонов к новым, с названиями', () => {
    expect(teamBalanceBySeason(games, seasons)).toEqual([
      { seasonId: 's1', name: 'Зима', games: 2, red: 1, black: 1, draws: 0 },
      { seasonId: 's2', name: 'Весна', games: 1, red: 0, black: 0, draws: 1 },
    ]);
  });
});

describe('roleWinrates', () => {
  it('по всем выходам в роли, без шерифа и дона (они повторяют мирных и мафию)', () => {
    const rows = roleWinrates(games);
    expect(rows.map((r) => r.role)).toEqual(['citizen', 'mafia']);
    // 3 игры × 6 мирных; победа только в игре «a»
    expect(rows[0]).toMatchObject({ games: 18, wins: 6 });
    expect(rows[0].winrate).toBeCloseTo(33.33, 1);
    expect(rows[1].games).toBe(6);
  });
});

describe('mostActive', () => {
  it('по числу игр, при равенстве — по нику', () => {
    const top = mostActive(games, players, 3);
    expect(top.map((t) => t.games)).toEqual([3, 3, 3]);
    expect(top[0].nickname.localeCompare(top[1].nickname, 'ru')).toBeLessThan(0);
    expect(mostActive(games, players).find((t) => t.id === 'p1').games).toBe(2);
  });
});

describe('newcomers', () => {
  it('первая игра в клубе — в периоде; свежие первыми', () => {
    const spring = games.filter((g) => g.seasonId === 's2');
    expect(newcomers(spring, games, players)).toEqual([
      { id: 'p11', nickname: 'Игрок p11', firstDate: '2026-03-05', games: 1 },
    ]);
    // За всё время новички — все; p11 — самый свежий
    expect(newcomers(games, games, players, 2)[0].id).toBe('p11');
  });
});
