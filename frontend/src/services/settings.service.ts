import { DEFAULT_CURRENCY, isMockApiEnabled, STORAGE_KEYS } from '@/lib/config';
import { DEFAULT_DASHBOARD_PERIOD } from '@/lib/constants';
import { DEMO_USER } from '@/mocks/users';
import type { FinancePreferences, FinanceSettings } from '@/types';
import { apiRequest } from './api-client';
import { getStoredUser, updateStoredUser } from './auth.service';
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

export async function fetchFinanceSettings(): Promise<FinanceSettings> {
  if (!isMockApiEnabled()) {
    const settings = await apiRequest<FinanceSettings>('/settings/finance');
    saveFinancePreferences({
      period: settings.period,
      notifyBudget: settings.notifyBudget,
      notifyBalance: settings.notifyBalance,
      notifyGoal: settings.notifyGoal,
    });
    return settings;
  }

  const activeUser = getStoredUser() ?? DEMO_USER;
  const preferences = getFinancePreferences();

  return {
    initialBalance: activeUser.initialBalance,
    minBalance: activeUser.minBalance,
    currency: activeUser.currency || DEFAULT_CURRENCY,
    period: preferences.period,
    notifyBudget: preferences.notifyBudget,
    notifyBalance: preferences.notifyBalance,
    notifyGoal: preferences.notifyGoal,
  };
}

export async function updateFinanceSettings(
  input: Partial<FinanceSettings>,
): Promise<FinanceSettings> {
  if (!isMockApiEnabled()) {
    const updated = await apiRequest<FinanceSettings>('/settings/finance', {
      method: 'PATCH',
      body: input,
    });
    saveFinancePreferences({
      period: updated.period,
      notifyBudget: updated.notifyBudget,
      notifyBalance: updated.notifyBalance,
      notifyGoal: updated.notifyGoal,
    });
    return updated;
  }

  const currentPrefs = getFinancePreferences();
  const nextPrefs: FinancePreferences = {
    period: input.period ?? currentPrefs.period,
    notifyBudget: input.notifyBudget ?? currentPrefs.notifyBudget,
    notifyBalance: input.notifyBalance ?? currentPrefs.notifyBalance,
    notifyGoal: input.notifyGoal ?? currentPrefs.notifyGoal,
  };
  saveFinancePreferences(nextPrefs);

  const updatedUser = updateStoredUser({
    initialBalance: input.initialBalance,
    minBalance: input.minBalance,
    currency: input.currency ?? DEFAULT_CURRENCY,
  });

  return {
    initialBalance: updatedUser.initialBalance,
    minBalance: updatedUser.minBalance,
    currency: updatedUser.currency,
    ...nextPrefs,
  };
}
