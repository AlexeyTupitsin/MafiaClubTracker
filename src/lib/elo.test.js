import { describe, it, expect } from 'vitest';
import {
  ELO_START, ELO_MEAN_BONUS, expectedScore, kFactor, calcGameElo, replayElo,
  compareGamesChronologically, playerEloHistory, eloExplanationLines,
} from './elo';
import { makeGame, PLAYER_IDS } from '../test/fixtures';

const RED = PLAYER_IDS.slice(0, 7);
const BLACK = PLAYER_IDS.slice(7);

// Эталонные значения посчитаны вручную по формуле из docs/METRICS.md:
//   E_A = 1 / (1 + 10^((R_B − R_A) / 400)),  Δ = k × (S_A − E_A − B),  B = 0.17

describe('конфигурация', () => {
  it('стартовый рейтинг 1000 и обычный доп. балл 0.17', () => {
    expect(ELO_START).toBe(1000);
    expect(ELO_MEAN_BONUS).toBe(0.17);
  });
});

describe('expectedScore', () => {
  it('равные рейтинги — 0.5', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
  });

  it('разница 400 — классические 10:1', () => {
    expect(expectedScore(1400, 1000)).toBeCloseTo(10 / 11, 10);
    expect(expectedScore(1000, 1400)).toBeCloseTo(1 / 11, 10);
  });

  it('ожидания двух сторон в сумме дают 1', () => {
    expect(expectedScore(1234, 987) + expectedScore(987, 1234)).toBeCloseTo(1, 12);
  });

  it('не выходит за (0; 1) даже при огромной разнице', () => {
    const e = expectedScore(3000, 0);
    expect(e).toBeGreaterThan(0.99);
    expect(e).toBeLessThan(1);
  });
});

describe('kFactor', () => {
  it('40 до 30 игр включительно, дальше 20', () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(30)).toBe(40);
    expect(kFactor(31)).toBe(20);
  });
});

describe('calcGameElo', () => {
  it('первая игра: победа красных при равных рейтингах', () => {
    const game = makeGame({ winner: 'red' });
    const result = calcGameElo(game, new Map(), new Map());

    const byId = new Map(result.map((r) => [r.playerId, r]));
    for (const id of RED) {
      expect(byId.get(id).expected).toBe(0.5);
      expect(byId.get(id).k).toBe(40);
      expect(byId.get(id).delta).toBeCloseTo(13.2, 10); // 40 × (1 − 0.5 − 0.17)
      expect(byId.get(id).eloAfter).toBeCloseTo(1013.2, 10);
    }
    for (const id of BLACK) {
      expect(byId.get(id).delta).toBeCloseTo(-26.8, 10); // 40 × (0 − 0.5 − 0.17)
    }
  });

  it('доп. балл входит в S_A', () => {
    const game = makeGame({ winner: 'red', scores: { p1: { base: 1, bonus: 0.5 } } });
    const p1 = calcGameElo(game, new Map(), new Map()).find((r) => r.playerId === 'p1');
    expect(p1.sA).toBe(1.5);
    expect(p1.delta).toBeCloseTo(33.2, 10); // 40 × (1.5 − 0.5 − 0.17)
  });

  it('k = 20 только после 30 уже сыгранных игр', () => {
    const game = makeGame({ winner: 'red', scores: { p1: { base: 1, bonus: 0.5 } } });
    const k = (played) => calcGameElo(game, new Map(), new Map([['p1', played]]))
      .find((r) => r.playerId === 'p1');
    expect(k(30).k).toBe(40);
    expect(k(31).k).toBe(20);
    expect(k(31).delta).toBeCloseTo(16.6, 10); // 20 × (1.5 − 0.5 − 0.17)
  });

  it('R_A и R_B — средние рейтинги команд, включая самого игрока', () => {
    const game = makeGame();
    const ratings = new Map([['p1', 1070], ['p8', 1090]]); // остальные по 1000
    const p1 = calcGameElo(game, ratings, new Map()).find((r) => r.playerId === 'p1');
    expect(p1.rA).toBeCloseTo(1010, 10); // (1070 + 6 × 1000) / 7
    expect(p1.rB).toBeCloseTo(1030, 10); // (1090 + 2 × 1000) / 3
    expect(p1.eloBefore).toBe(1070);
  });

  it('вырожденный состав без одной команды — рейтинг не меняется', () => {
    const game = makeGame({ roles: Array(10).fill('citizen') });
    const result = calcGameElo(game, new Map([['p1', 1100]]), new Map());
    for (const r of result) {
      expect(r.delta).toBe(0);
      expect(r.expected).toBeNull();
      expect(r.k).toBeNull();
    }
    expect(result[0].eloAfter).toBe(1100);
  });
});

describe('replayElo', () => {
  const game1 = makeGame({ id: 'g1', gameNumber: 1, date: '2026-01-01T19:00:00Z', winner: 'red' });
  const game2 = makeGame({ id: 'g2', gameNumber: 2, date: '2026-01-02T19:00:00Z', winner: 'black' });

  it('прогоняет игры по хронологии, независимо от порядка на входе', () => {
    const { perGame, final } = replayElo([game2, game1]);

    // Во второй игре красные — 1013.2, чёрные — 973.2
    const g2p1 = perGame.get('g2').get('p1');
    expect(g2p1.eloBefore).toBeCloseTo(1013.2, 10);
    expect(g2p1.rB).toBeCloseTo(973.2, 10);
    expect(g2p1.expected).toBeCloseTo(0.5573116337622928, 12);
    expect(g2p1.delta).toBeCloseTo(-29.09246535049171, 10);

    expect(final.get('p1').elo).toBeCloseTo(984.1075346495084, 10);
    expect(final.get('p8').elo).toBeCloseTo(988.6924653504917, 10);
    expect(final.get('p1').eloGames).toBe(2);
  });

  it('хранит рейтинг без округления', () => {
    const { final } = replayElo([game1, game2]);
    expect(Number.isInteger(final.get('p1').elo)).toBe(false);
  });

  it('пустая история — пустой результат', () => {
    const { perGame, final } = replayElo([]);
    expect(perGame.size).toBe(0);
    expect(final.size).toBe(0);
  });
});

describe('compareGamesChronologically', () => {
  it('дата без учёта времени, затем номер игры', () => {
    const late = makeGame({ id: 'a', gameNumber: 2, date: '2026-01-01T08:00:00Z' });
    const early = makeGame({ id: 'b', gameNumber: 1, date: '2026-01-01T23:00:00Z' });
    const nextDay = makeGame({ id: 'c', gameNumber: 1, date: '2026-01-02T08:00:00Z' });
    const sorted = [nextDay, late, early].sort(compareGamesChronologically).map((g) => g.id);
    expect(sorted).toEqual(['b', 'a', 'c']);
  });

  it('при равных дате и номере — по времени создания', () => {
    const first = makeGame({ id: 'x', createdAt: '2026-01-01T10:00:00Z' });
    const second = makeGame({ id: 'y', createdAt: '2026-01-01T11:00:00Z' });
    expect([second, first].sort(compareGamesChronologically).map((g) => g.id)).toEqual(['x', 'y']);
  });
});

// Игра с сохранёнными в БД ELO-полями — так её видит интерфейс
function withStoredElo(game, perGame) {
  return {
    ...game,
    players: game.players.map((p) => {
      const e = perGame.get(game.id).get(p.playerId);
      return {
        ...p,
        eloBefore: e.eloBefore,
        eloExpected: e.expected,
        eloK: e.k,
        eloDelta: e.delta,
        eloAfter: e.eloAfter,
      };
    }),
  };
}

describe('playerEloHistory и eloExplanationLines', () => {
  const game1 = makeGame({ id: 'g1', gameNumber: 1, date: '2026-01-01T19:00:00Z', winner: 'red' });
  const game2 = makeGame({ id: 'g2', gameNumber: 2, date: '2026-01-02T19:00:00Z', winner: 'black' });
  const { perGame } = replayElo([game1, game2]);
  const stored = [withStoredElo(game2, perGame), withStoredElo(game1, perGame)];

  it('история игрока — в хронологическом порядке, из сохранённых полей', () => {
    const history = playerEloHistory('p1', stored);
    expect(history.map((h) => h.gameId)).toEqual(['g1', 'g2']);
    expect(history[0].eloBefore).toBe(1000);
    expect(history[1].eloAfter).toBeCloseTo(984.1075346495084, 10);
  });

  it('игры без ELO в историю не попадают', () => {
    expect(playerEloHistory('p1', [game1])).toEqual([]);
  });

  it('расшифровка расчёта содержит все величины формулы', () => {
    // ru-RU разделяет тысячи неразрывным пробелом — сравниваем без него
    const lines = eloExplanationLines(stored[1], stored[1].players[0])
      .map((line) => line.replace(/\s/g, ' '));
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('R_A = 1 000 (своя команда)');
    expect(lines[4]).toBe('S_A = 1,0 (баллы за игру)');
    expect(lines[6]).toBe('k = 40 (не более 30 игр)');
    expect(lines[7]).toBe('Δ = 40 × (1,0 − 0,500 − 0,17) = +13,2');
    expect(lines[8]).toBe('ELO = 1 000,0 + 13,2 = 1 013,2');
  });

  it('без сохранённого ELO расшифровки нет', () => {
    expect(eloExplanationLines(game1, game1.players[0])).toBeNull();
  });
});
