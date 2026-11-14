import { STORAGE_KEYS } from '@/lib/config';
import { DEFAULT_DASHBOARD_PERIOD } from '@/lib/constants';
import type { FinancePreferences } from '@/types';
import { readJson, writeJson } from './local-storage';

export const DEFAULT_FINANCE_PREFERENCES: FinancePreferences = {
  period: DEFAULT_DASHBOARD_PERIOD,
  notifyBudget: true,
  notifyBalance: true,
  notifyGoal: true,
};

function isFinancePreferences(value: unknown): value is FinancePreferences {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<FinancePreferences>;

  return (
    (candidate.period === '7d' ||
      candidate.period === '30d' ||
      candidate.period === 'month') &&
    typeof candidate.notifyBudget === 'boolean' &&
    typeof candidate.notifyBalance === 'boolean' &&
    typeof candidate.notifyGoal === 'boolean'
  );
}

export function getFinancePreferences(): FinancePreferences {
  return readJson(
    STORAGE_KEYS.preferences,
    isFinancePreferences,
    () => ({ ...DEFAULT_FINANCE_PREFERENCES }),
  );
}

export function saveFinancePreferences(
  preferences: FinancePreferences,
): void {
  writeJson(STORAGE_KEYS.preferences, preferences);
}
