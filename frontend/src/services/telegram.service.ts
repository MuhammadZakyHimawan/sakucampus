import { isMockApiEnabled, STORAGE_KEYS } from '@/lib/config';
import type { TelegramLinkTokenResponse, TelegramStatus } from '@/types';
import { toISODate } from '@/utils/date';
import { apiRequest } from './api-client';
import { readJson, writeJson } from './local-storage';

const MOCK_DELAY = 600;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

const DEFAULT_STATUS: TelegramStatus = {
  connected: false,
  simulated: true,
};

function isTelegramStatusLike(value: unknown): value is TelegramStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<TelegramStatus>;

  return (
    typeof candidate.connected === 'boolean' &&
    (candidate.username === undefined ||
      typeof candidate.username === 'string') &&
    (candidate.linkedAt === undefined ||
      candidate.linkedAt === null ||
      typeof candidate.linkedAt === 'string') &&
    (candidate.simulated === undefined ||
      typeof candidate.simulated === 'boolean')
  );
}

function normalizeTelegramStatus(status: TelegramStatus): TelegramStatus {
  const uname = status.telegramUsername ?? status.username ?? undefined;
  return {
    ...status,
    username: uname ?? undefined,
    telegramUsername: uname ?? null,
    simulated: isMockApiEnabled(),
  };
}

export function getTelegramStatus(): TelegramStatus {
  return readJson(STORAGE_KEYS.telegram, isTelegramStatusLike, () => ({
    ...DEFAULT_STATUS,
  }));
}

export async function fetchTelegramStatus(): Promise<TelegramStatus> {
  if (!isMockApiEnabled()) {
    const raw = await apiRequest<TelegramStatus>('/telegram/status');
    return normalizeTelegramStatus(raw);
  }

  return getTelegramStatus();
}

export async function createTelegramLinkToken(): Promise<TelegramLinkTokenResponse> {
  if (!isMockApiEnabled()) {
    return apiRequest<TelegramLinkTokenResponse>('/telegram/link-token', {
      method: 'POST',
    });
  }

  await wait(300);
  const token = `demo-token-${Date.now().toString(36)}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  return {
    token,
    expiresAt,
    deepLink: null,
    startCommand: `/start ${token}`,
  };
}

export async function connectTelegram(
  usernameSource: string,
): Promise<TelegramStatus> {
  await wait(MOCK_DELAY);

  const baseUsername = usernameSource.trim().split('@')[0] || 'mahasiswa';
  const status: TelegramStatus = {
    connected: true,
    username: `@${baseUsername.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    telegramUsername: `@${baseUsername.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    linkedAt: toISODate(new Date()),
    simulated: true,
  };

  writeJson(STORAGE_KEYS.telegram, status);

  return status;
}

export async function disconnectTelegram(): Promise<TelegramStatus> {
  if (!isMockApiEnabled()) {
    const raw = await apiRequest<TelegramStatus>('/telegram/unlink', {
      method: 'DELETE',
    });
    return normalizeTelegramStatus(raw);
  }

  await wait(MOCK_DELAY);

  const status: TelegramStatus = {
    ...DEFAULT_STATUS,
    connected: false,
  };

  writeJson(STORAGE_KEYS.telegram, status);

  return status;
}
