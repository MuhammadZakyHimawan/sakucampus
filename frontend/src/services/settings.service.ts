import { DEFAULT_CURRENCY, MOCK_API_ENABLED, STORAGE_KEYS } from '@/lib/config';
import { DEFAULT_DASHBOARD_PERIOD } from '@/lib/constants';
import type { FinancePreferences, FinanceSettings, User } from '@/types';
import { apiRequest } from './api-client';
import { readJson, writeJson } from './local-storage';

export const DEFAULT_FINANCE_PREFERENCES: FinancePreferences = {
  period: DEFAULT_DASHBOARD_PERIOD,
  notifyBudget: true,
  notifyBalance: true,
  notifyGoal: true,
};

export type FinanceSettingsUpdate = Partial<
  Pick<
    FinanceSettings,
    | 'initialBalance'
    | 'minBalance'
    | 'period'
    | 'notifyBudget'
    | 'notifyBalance'
    | 'notifyGoal'
  >
>;

let cachedSettings: FinanceSettings | null = null;

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

function pickPreferences(settings: FinanceSettings): FinancePreferences {
  return {
    period: settings.period,
    notifyBudget: settings.notifyBudget,
    notifyBalance: settings.notifyBalance,
    notifyGoal: settings.notifyGoal,
  };
}

function rememberSettings(settings: FinanceSettings): void {
  cachedSettings = settings;
  saveFinancePreferences(pickPreferences(settings));
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

  if (cachedSettings) {
    cachedSettings = {
      ...cachedSettings,
      ...preferences,
    };
  }
}

export function createFinanceSettings(user: User): FinanceSettings {
  return {
    ...getFinancePreferences(),
    currency: user.currency || DEFAULT_CURRENCY,
    initialBalance: user.initialBalance,
    minBalance: user.minBalance,
  };
}

export async function getFinanceSettings(
  fallback: FinanceSettings,
): Promise<FinanceSettings> {
  if (!MOCK_API_ENABLED) {
    const settings = await apiRequest<FinanceSettings>('/settings/finance');

    rememberSettings(settings);
    return settings;
  }

  cachedSettings = fallback;
  return fallback;
}

export async function updateFinanceSettings(
  input: FinanceSettingsUpdate,
): Promise<FinanceSettings> {
  if (!MOCK_API_ENABLED) {
    const settings = await apiRequest<FinanceSettings>('/settings/finance', {
      method: 'PATCH',
      body: input,
    });

    rememberSettings(settings);
    return settings;
  }

  const current =
    cachedSettings ??
    ({
      ...DEFAULT_FINANCE_PREFERENCES,
      currency: DEFAULT_CURRENCY,
      initialBalance: 0,
      minBalance: 0,
    } satisfies FinanceSettings);
  const next: FinanceSettings = { ...current, ...input };

  rememberSettings(next);
  return next;
}

export async function updateFinancePreferences(
  preferences: FinancePreferences,
): Promise<FinancePreferences> {
  const settings = await updateFinanceSettings(preferences);

  return pickPreferences(settings);
}
