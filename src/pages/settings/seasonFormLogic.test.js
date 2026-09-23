import { describe, it, expect } from 'vitest';
import {
  NEW_SEASON_FORM, seasonToForm, isThresholdValid, thresholdForSave,
  withThresholdType, withTrackFirstKill,
} from './seasonFormLogic';

describe('isThresholdValid', () => {
  it('без порога — всегда верно', () => {
    expect(isThresholdValid('none', '')).toBe(true);
  });

  it('минимум игр — целое от 1', () => {
    expect(isThresholdValid('absolute', '5')).toBe(true);
    expect(isThresholdValid('absolute', '0')).toBe(false);
    expect(isThresholdValid('absolute', '')).toBe(false);
    expect(isThresholdValid('absolute', '250')).toBe(true);
  });

  it('процент — от 1 до 100', () => {
    expect(isThresholdValid('percent', '100')).toBe(true);
    expect(isThresholdValid('percent', '101')).toBe(false);
  });
});

describe('thresholdForSave', () => {
  it('без порога — 0, иначе целое число', () => {
    expect(thresholdForSave('none', '15')).toBe(0);
    expect(thresholdForSave('percent', '30')).toBe(30);
    expect(thresholdForSave('absolute', '')).toBe(0);
  });
});

describe('seasonToForm', () => {
  it('переносит поля сезона в форму', () => {
    expect(seasonToForm({
      name: 'Осень', trackFirstKill: true, trackBestMove: true,
      ratingThresholdType: 'absolute', ratingThresholdValue: 10,
    })).toEqual({
      name: 'Осень', trackFirstKill: true, trackBestMove: true,
      thresholdType: 'absolute', thresholdValue: '10',
    });
  });

  it('старые сезоны без флагов и порога', () => {
    expect(seasonToForm({ name: 'Весна', ratingThresholdValue: 5 })).toEqual({
      name: 'Весна', trackFirstKill: false, trackBestMove: false,
      thresholdType: 'none', thresholdValue: '',
    });
  });
});

describe('изменения формы', () => {
  it('смена типа порога: none очищает, иначе подставляет 1 в пустое', () => {
    const form = { ...NEW_SEASON_FORM, thresholdType: 'absolute', thresholdValue: '7' };
    expect(withThresholdType(form, 'none').thresholdValue).toBe('');
    expect(withThresholdType(form, 'percent').thresholdValue).toBe('7');
    expect(withThresholdType(NEW_SEASON_FORM, 'absolute').thresholdValue).toBe('1');
  });

  it('выключение первоубиенного выключает и лучший ход', () => {
    const form = { ...NEW_SEASON_FORM, trackFirstKill: true, trackBestMove: true };
    expect(withTrackFirstKill(form, false)).toMatchObject({ trackFirstKill: false, trackBestMove: false });
    expect(withTrackFirstKill(form, true)).toMatchObject({ trackFirstKill: true, trackBestMove: true });
  });
});
