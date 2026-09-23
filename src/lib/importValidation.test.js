import { describe, it, expect } from 'vitest';
import { validateImportData, formatImportErrors } from './importValidation';
import { makeGame, makePlayers } from '../test/fixtures';

// Файл экспорта в формате exportAllData
function makeExport(overrides = {}) {
  return {
    version: 2,
    seasons: [{ id: 's1', name: 'Сезон 1', startDate: '2026-01-01' }],
    players: makePlayers(),
    tournaments: [{ id: 't1', seasonId: 's1', name: 'Кубок', date: '2026-02-01' }],
    games: { s1: [makeGame({ id: 'g1', gameNumber: 1 }), makeGame({ id: 'g2', gameNumber: 2, tournamentId: 't1' })] },
    ...overrides,
  };
}

describe('validateImportData', () => {
  it('корректный экспорт проходит', () => {
    expect(validateImportData(makeExport())).toEqual([]);
  });

  it('турниры необязательны', () => {
    const data = makeExport({ tournaments: undefined, games: { s1: [makeGame()] } });
    expect(validateImportData(data)).toEqual([]);
  });

  it('не объект или нет основных разделов', () => {
    expect(validateImportData(null)).toHaveLength(1);
    expect(validateImportData([])).toHaveLength(1);
    expect(validateImportData({ seasons: [], players: [] })).toEqual(['Нет игр по сезонам (games)']);
    // Старый формат: games — массив, а не объект по сезонам
    expect(validateImportData(makeExport({ games: [] }))).toEqual(['Нет игр по сезонам (games)']);
  });

  it('игрок из состава отсутствует в списке игроков', () => {
    const data = makeExport({ players: makePlayers().slice(1) }); // нет p1
    const errors = validateImportData(data);
    expect(errors.some((e) => e.includes('игрок p1 не найден'))).toBe(true);
  });

  it('повторы: ник, место, номер игры', () => {
    const players = makePlayers();
    players[1].nickname = players[0].nickname;

    const game = makeGame({ gameNumber: 1 });
    game.players[1].seat = 1;

    const data = makeExport({ players, games: { s1: [game, makeGame({ id: 'g2', gameNumber: 1 })] } });
    const errors = validateImportData(data);
    expect(errors).toContain(`Ник «${players[0].nickname}» встречается дважды`);
    expect(errors).toContain('Игра №1 (сезон «Сезон 1»): место 1 занято дважды');
    expect(errors).toContain('Игра №1 (сезон «Сезон 1»): номер повторяется');
  });

  it('неизвестные роль, результат и победитель', () => {
    const game = makeGame({ winner: 'green' });
    game.players[0].role = 'maniac';
    game.players[1].result = 'won';
    const errors = validateImportData(makeExport({ games: { s1: [game] } }));
    expect(errors).toEqual([
      'Игра №1 (сезон «Сезон 1»): неизвестный победитель «green»',
      'Игра №1 (сезон «Сезон 1»): неизвестная роль «maniac»',
      'Игра №1 (сезон «Сезон 1»): неизвестный результат «won»',
    ]);
  });

  it('ссылки на несуществующие сезон, турнир и первого убитого', () => {
    const data = makeExport({
      tournaments: [{ id: 't1', seasonId: 'nope', name: 'Кубок', date: '2026-02-01' }],
      games: {
        s1: [makeGame({ tournamentId: 't404', firstKilled: 'p404' })],
        s404: [makeGame()],
      },
    });
    expect(validateImportData(data)).toEqual([
      'Турнир «Кубок»: сезон не найден в файле',
      'Игра №1 (сезон «Сезон 1»): турнир не найден в файле',
      'Игра №1 (сезон «Сезон 1»): первый убитый не найден среди игроков',
      'Игры сезона s404: сезон не найден в файле',
    ]);
  });

  it('игра без состава', () => {
    const errors = validateImportData(makeExport({ games: { s1: [makeGame({ players: [] })] } }));
    expect(errors).toEqual(['Игра №1 (сезон «Сезон 1»): нет состава']);
  });
});

describe('formatImportErrors', () => {
  it('показывает первые 10 и сколько ещё', () => {
    const errors = Array.from({ length: 13 }, (_, i) => `e${i + 1}`);
    expect(formatImportErrors(errors)).toBe('e1; e2; e3; e4; e5; e6; e7; e8; e9; e10; и ещё 3');
    expect(formatImportErrors(['a', 'b'])).toBe('a; b');
  });
});
