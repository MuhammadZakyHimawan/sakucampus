import { STORAGE_KEYS } from '@/lib/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

describe('telegram service (mock mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it('returns a disconnected simulated status by default', async () => {
    const service = await import('./telegram.service');

    expect(await service.getTelegramStatus()).toEqual({
      connected: false,
      simulated: true,
    });
  });

  it('connects and disconnects the demo status locally', async () => {
    const service = await import('./telegram.service');

    const connected = await service.connectTelegram('Andi Pratama');
    expect(connected.connected).toBe(true);
    expect(connected.username).toBe('@Andi_Pratama');
    expect(connected.simulated).toBe(true);

    const disconnected = await service.disconnectTelegram();
    expect(disconnected).toEqual({ connected: false, simulated: true });
    expect(window.localStorage.getItem(STORAGE_KEYS.telegram)).toBe(
      JSON.stringify(disconnected),
    );
  });
});

describe('telegram service (HTTP mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    window.localStorage.clear();
  });

  it('reads the status from the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        connected: true,
        username: '@andi_tg',
        linkedAt: '2026-11-17T10:00:00Z',
        botUsername: 'sakucampus_bot',
        simulated: false,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = await import('./telegram.service');

    const status = await service.getTelegramStatus();

    expect(status.connected).toBe(true);
    expect(status.simulated).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/telegram/status',
      expect.anything(),
    );
  });

  it('creates a link token through the API', async () => {
    const token = {
      token: 'raw-token',
      deepLink: 'https://t.me/sakucampus_bot?start=raw-token',
      expiresAt: '2026-11-17T10:15:00Z',
      botUsername: 'sakucampus_bot',
      simulated: false,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(token));
    vi.stubGlobal('fetch', fetchMock);
    const service = await import('./telegram.service');

    expect(await service.createTelegramLinkToken()).toEqual(token);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/telegram/link-token',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('unlinks through the API without touching local storage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ connected: false, simulated: false }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = await import('./telegram.service');

    const status = await service.disconnectTelegram();

    expect(status.connected).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/telegram/unlink',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(window.localStorage.getItem(STORAGE_KEYS.telegram)).toBeNull();
  });
});
