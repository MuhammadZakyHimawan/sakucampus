import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, STORAGE_KEYS } from '@/lib/config';
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

function setCsrfCookie(value = 'csrf-1'): void {
  document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(value)}; path=/`;
}

function clearCsrfCookie(): void {
  document.cookie = `${CSRF_COOKIE_NAME}=; max-age=0; path=/`;
}

describe('auth service (HTTP mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1');
    window.localStorage.clear();
    clearCsrfCookie();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    window.localStorage.clear();
    clearCsrfCookie();
  });

  it('logs in, caches the user, and uses cookie-based requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
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
    expect(auth.getStoredUser()).toEqual(user);
    expect(window.localStorage.getItem('sakucampus.token.v1')).toBeNull();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://api.example.test/v1/auth/login');
    expect(init.body).toBe(
      JSON.stringify({ email: 'andi@example.com', password: 'demo1234' }),
    );
    expect(init.credentials).toBe('include');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('does not call the profile endpoint for local-only balance updates', async () => {
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

  it('changes the password with the CSRF header', async () => {
    setCsrfCookie();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(undefined, 204));
    vi.stubGlobal('fetch', fetchMock);

    const auth = await import('./auth.service');

    await auth.changePassword('demo1234', 'baru1234');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://api.example.test/v1/auth/change-password');
    expect(headers.get(CSRF_HEADER_NAME)).toBe('csrf-1');
    expect(headers.get('Authorization')).toBeNull();
    expect(init.credentials).toBe('include');
    expect(init.body).toBe(
      JSON.stringify({ currentPassword: 'demo1234', newPassword: 'baru1234' }),
    );
  });

  it('clears the local session on logout', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.auth,
      JSON.stringify({ ...API_USER, avatarUrl: undefined }),
    );
    setCsrfCookie();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(undefined, 204));
    vi.stubGlobal('fetch', fetchMock);

    const auth = await import('./auth.service');

    await auth.logout();

    expect(window.localStorage.getItem('sakucampus.token.v1')).toBeNull();
    expect(auth.getStoredUser()).toBeNull();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://api.example.test/v1/auth/logout');
    expect(headers.get(CSRF_HEADER_NAME)).toBe('csrf-1');
    expect(init.credentials).toBe('include');
  });

  it('restores the session from the server', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...API_USER, name: 'Andi Baru' }));
    vi.stubGlobal('fetch', fetchMock);

    const auth = await import('./auth.service');
    const user = await auth.getCurrentUser();

    expect(user?.name).toBe('Andi Baru');
    expect(auth.getStoredUser()?.name).toBe('Andi Baru');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://api.example.test/v1/auth/me');
    expect((init.headers as Headers).get('Authorization')).toBeNull();
    expect(init.credentials).toBe('include');
  });

  it('clears the cached user when the server rejects the session', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.auth,
      JSON.stringify({ ...API_USER, avatarUrl: undefined }),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const auth = await import('./auth.service');

    await expect(auth.getCurrentUser()).resolves.toBeNull();
    expect(auth.getStoredUser()).toBeNull();
  });
});
