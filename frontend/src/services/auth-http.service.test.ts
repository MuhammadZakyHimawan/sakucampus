import { STORAGE_KEYS } from '@/lib/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API_USER = {
  id: '6f4d2a4e-1f4c-4f63-9b0e-6c1c2d3e4f50',
  name: 'Andi Pratama',
  email: 'andi@example.com',
  currency: 'IDR',
  initialBalance: 1_000_000,
  minBalance: 250_000,
  avatarUrl: null,
};

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

describe('auth service (HTTP mode)', () => {
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

  it('logs in, stores the token, and reads the cached user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        accessToken: 'token-1',
        expiresIn: 3600,
        user: API_USER,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const auth = await import('./auth.service');
    const user = await auth.login('andi@example.com', 'demo1234');

    expect(user).toEqual({
      ...API_USER,
      avatarUrl: undefined,
    });
    expect(window.localStorage.getItem(STORAGE_KEYS.token)).toBe('token-1');
    expect(auth.getStoredUser()).toEqual(user);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://api.example.test/v1/auth/login');
    expect(init.body).toBe(
      JSON.stringify({ email: 'andi@example.com', password: 'demo1234' }),
    );
  });

  it('does not call the profile endpoint for local-only balance updates', async () => {
    window.localStorage.setItem(STORAGE_KEYS.token, 'token-1');
    window.localStorage.setItem(
      STORAGE_KEYS.auth,
      JSON.stringify({ ...API_USER, avatarUrl: undefined }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const auth = await import('./auth.service');
    const updated = await auth.updateProfile({ initialBalance: 2_000_000 });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updated.initialBalance).toBe(2_000_000);
    expect(auth.getStoredUser()?.initialBalance).toBe(2_000_000);
  });

  it('changes the password through the API', async () => {
    window.localStorage.setItem(STORAGE_KEYS.token, 'token-1');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(undefined, 204));
    vi.stubGlobal('fetch', fetchMock);

    const auth = await import('./auth.service');

    await auth.changePassword('demo1234', 'baru1234');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://api.example.test/v1/auth/change-password');
    expect(headers.get('Authorization')).toBe('Bearer token-1');
    expect(init.body).toBe(
      JSON.stringify({ currentPassword: 'demo1234', newPassword: 'baru1234' }),
    );
  });

  it('clears the local session on logout', async () => {
    window.localStorage.setItem(STORAGE_KEYS.token, 'token-1');
    window.localStorage.setItem(
      STORAGE_KEYS.auth,
      JSON.stringify({ ...API_USER, avatarUrl: undefined }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(undefined, 204)),
    );

    const auth = await import('./auth.service');

    auth.logout();

    expect(window.localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    expect(auth.getStoredUser()).toBeNull();
  });
});
