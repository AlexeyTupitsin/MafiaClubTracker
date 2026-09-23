import { describe, it, expect } from 'vitest';
import {
  ROLE_SET, emptySeats, parseBonus, acceptBonusInput, isBonusInvalid, toggleBonusSign,
  seatOutcome, formatTotal, buildGamePlayers, countRoles, rolesAreValid, fillRandomRoles,
  nextGameNumber,
} from './gameFormLogic';

describe('доп. балл', () => {
  it('parseBonus: запятая, незаконченный ввод и мусор', () => {
    expect(parseBonus('0,5')).toBe(0.5);
    expect(parseBonus('-1.5')).toBe(-1.5);
    for (const partial of ['', '-', '.', '-.', ',']) expect(parseBonus(partial)).toBe(0);
    expect(parseBonus('abc')).toBe(0);
  });

  it('acceptBonusInput: принимает незаконченный ввод и числа от −5 до 5', () => {
    for (const ok of ['', '-', '.', '-.', ',', '0', '5', '-5', '0,3', '2.']) {
      expect(acceptBonusInput(ok)).toBe(true);
    }
    for (const bad of ['5.1', '-6', 'x', '1e3']) expect(acceptBonusInput(bad)).toBe(false);
  });

  it('isBonusInvalid: пустое и незаконченное — не ошибка', () => {
    expect(isBonusInvalid('')).toBe(false);
    expect(isBonusInvalid('-')).toBe(false);
    expect(isBonusInvalid('0.5')).toBe(false);
    expect(isBonusInvalid('7')).toBe(true);
    expect(isBonusInvalid('abc')).toBe(true);
  });

  it('toggleBonusSign меняет знак, ноль и пустое не трогает', () => {
    expect(toggleBonusSign('0.5')).toBe('-0.5');
    expect(toggleBonusSign('-0.5')).toBe('0.5');
    expect(toggleBonusSign('0')).toBe('0');
    expect(toggleBonusSign('')).toBe('');
  });
});

describe('результат места', () => {
  it('победа, поражение и ничья по команде роли', () => {
    expect(seatOutcome('sheriff', 'red')).toEqual({ result: 'win', baseScore: 1 });
    expect(seatOutcome('don', 'red')).toEqual({ result: 'lose', baseScore: 0 });
    expect(seatOutcome('mafia', 'black')).toEqual({ result: 'win', baseScore: 1 });
    expect(seatOutcome('citizen', 'draw')).toEqual({ result: 'draw', baseScore: 0 });
  });

  it('formatTotal: целые без дробной части, остальное — один знак', () => {
    expect(formatTotal(1)).toBe('1');
    expect(formatTotal(1.5)).toBe('1.5');
    expect(formatTotal(-0.3)).toBe('-0.3');
  });
});

describe('buildGamePlayers', () => {
  it('собирает строки игроков для сохранения', () => {
    const seats = emptySeats().map((s) => ({ ...s, playerId: `p${s.seat}` }));
    const players = buildGamePlayers({
      seats,
      roles: ROLE_SET,
      winner: 'red',
      bonusScores: ['0,5', ...Array(8).fill('0'), '-'],
      bonusComments: ['  лучший ход ', ...Array(9).fill('  ')],
    });

    expect(players).toHaveLength(10);
    expect(players[0]).toEqual({
      playerId: 'p1', seat: 1, role: 'citizen', result: 'win',
      baseScore: 1, bonusScore: 0.5, bonusComment: 'лучший ход', totalScore: 1.5,
    });
    expect(players[9]).toMatchObject({
      role: 'don', result: 'lose', baseScore: 0, bonusScore: 0, bonusComment: null, totalScore: 0,
    });
  });
});

describe('роли', () => {
  it('ROLE_SET — 6 мирных, шериф, 2 мафии, дон', () => {
    expect(countRoles(ROLE_SET)).toEqual({ citizen: 6, sheriff: 1, mafia: 2, don: 1 });
  });

  it('countRoles пропускает пустые места', () => {
    expect(countRoles(['citizen', '', 'don'])).toEqual({ citizen: 1, sheriff: 0, mafia: 0, don: 1 });
  });

  it('rolesAreValid: все места заполнены и состав точный', () => {
    expect(rolesAreValid(ROLE_SET)).toBe(true);
    expect(rolesAreValid([...ROLE_SET.slice(0, 9), ''])).toBe(false);
    expect(rolesAreValid([...ROLE_SET.slice(0, 9), 'citizen'])).toBe(false);
  });

  it('fillRandomRoles дозаполняет недостающие роли и не трогает выбранные', () => {
    const partial = ['don', 'don', '', '', '', '', '', '', '', 'sheriff'];
    const filled = fillRandomRoles(partial, () => 0.5);
    expect(filled[0]).toBe('don');
    expect(filled[1]).toBe('don'); // лишний дон остаётся — форма покажет ошибку состава
    expect(filled[9]).toBe('sheriff');
    expect(filled.every(Boolean)).toBe(true);
    // на пустые места ушли только мирные и мафия
    expect(countRoles(filled.slice(2, 9))).toMatchObject({ sheriff: 0, don: 0 });
  });

  it('fillRandomRoles на пустом столе даёт полный корректный состав', () => {
    for (let run = 0; run < 20; run++) {
      expect(rolesAreValid(fillRandomRoles(Array(10).fill('')))).toBe(true);
    }
  });

  it('fillRandomRoles не мутирует входной массив', () => {
    const roles = Array(10).fill('');
    fillRandomRoles(roles);
    expect(roles.every((r) => r === '')).toBe(true);
  });
});

describe('nextGameNumber', () => {
  it('максимальный номер + 1, для пустого сезона — 1', () => {
    expect(nextGameNumber([{ gameNumber: 3 }, { gameNumber: 7 }, { gameNumber: 5 }])).toBe(8);
    expect(nextGameNumber([])).toBe(1);
  });
});
