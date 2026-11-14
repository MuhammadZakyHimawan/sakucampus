import { STORAGE_KEYS } from '@/lib/config';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FINANCE_PREFERENCES,
  getFinancePreferences,
  saveFinancePreferences,
} from './settings.service';

describe('settings service', () => {
  it('returns default preferences when none are stored', () => {
    expect(getFinancePreferences()).toEqual(DEFAULT_FINANCE_PREFERENCES);
    expect(window.localStorage.getItem(STORAGE_KEYS.preferences)).toBe(
      JSON.stringify(DEFAULT_FINANCE_PREFERENCES),
    );
  });

  it('persists finance preferences', () => {
    saveFinancePreferences({
      period: '7d',
      notifyBudget: false,
      notifyBalance: true,
      notifyGoal: false,
    });

    expect(getFinancePreferences()).toEqual({
      period: '7d',
      notifyBudget: false,
      notifyBalance: true,
      notifyGoal: false,
    });
  });
});
