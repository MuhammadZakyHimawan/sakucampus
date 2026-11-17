import { MOCK_API_ENABLED, STORAGE_KEYS } from '@/lib/config';
import type { TelegramLinkToken, TelegramStatus } from '@/types';
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
      typeof candidate.linkedAt === 'string') &&
    (candidate.simulated === undefined ||
      typeof candidate.simulated === 'boolean')
  );
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  if (!MOCK_API_ENABLED) {
    return apiRequest<TelegramStatus>('/telegram/status');
  }

  return readJson(STORAGE_KEYS.telegram, isTelegramStatusLike, () => ({
    ...DEFAULT_STATUS,
  }));
}

export async function createTelegramLinkToken(): Promise<TelegramLinkToken> {
  return apiRequest<TelegramLinkToken>('/telegram/link-token', {
    method: 'POST',
  });
}

export async function connectTelegram(
  usernameSource: string,
): Promise<TelegramStatus> {
  await wait(MOCK_DELAY);

  const baseUsername = usernameSource.trim().split('@')[0] || 'mahasiswa';
  const status: TelegramStatus = {
    connected: true,
    username: `@${baseUsername.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    linkedAt: toISODate(new Date()),
    simulated: true,
  };

  writeJson(STORAGE_KEYS.telegram, status);

  return status;
}

export async function disconnectTelegram(): Promise<TelegramStatus> {
  if (!MOCK_API_ENABLED) {
    return apiRequest<TelegramStatus>('/telegram/unlink', {
      method: 'DELETE',
    });
  }

  await wait(MOCK_DELAY);

  const status: TelegramStatus = {
    ...DEFAULT_STATUS,
    connected: false,
  };

  writeJson(STORAGE_KEYS.telegram, status);

  return status;
}
