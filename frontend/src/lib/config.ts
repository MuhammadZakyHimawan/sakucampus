export const APP_NAME = 'SakuCampus';
export const APP_DESCRIPTION =
  'Konsultan keuangan proaktif untuk membantu mahasiswa mengelola uang saku.';

export const DEFAULT_CURRENCY = 'IDR';
export const BUDGET_WARNING_THRESHOLD = 75;
export const BUDGET_EXCEEDED_THRESHOLD = 100;
export const DEFAULT_PAGE_SIZE = 8;

export const MOCK_API_ENABLED = import.meta.env.VITE_USE_MOCK_API !== 'false';

export const STORAGE_KEYS = {
  auth: 'sakucampus.auth.v1',
  token: 'sakucampus.token.v1',
  profile: 'sakucampus.profile.v1',
  data: 'sakucampus.data.v1',
  preferences: 'sakucampus.preferences.v1',
  goals: 'sakucampus.goals.v1',
  notifications: 'sakucampus.notifications.v1',
  telegram: 'sakucampus.telegram.v1',
} as const;
