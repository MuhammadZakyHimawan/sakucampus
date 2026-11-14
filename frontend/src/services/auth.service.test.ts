import { STORAGE_KEYS } from '@/lib/config';
import { DEMO_CREDENTIALS, DEMO_USER } from '@/mocks/users';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStoredUser,
  login,
  logout,
  register,
  updateStoredUser,
} from './auth.service';

async function runLogin(): Promise<Awaited<ReturnType<typeof login>>> {
  const promise = login(
    DEMO_CREDENTIALS.email,
    DEMO_CREDENTIALS.password,
  );
  await vi.advanceTimersByTimeAsync(500);
  return promise;
}

async function runRegister(): Promise<Awaited<ReturnType<typeof register>>> {
  const promise = register({
    name: 'Budi Santoso',
    email: 'budi@example.com',
    password: 'password123',
  });
  await vi.advanceTimersByTimeAsync(500);
  return promise;
}

describe('auth service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs in with the demo account and stores the session', async () => {
    const user = await runLogin();

    expect(user).toEqual(DEMO_USER);
    expect(getStoredUser()).toEqual(DEMO_USER);
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).toBe(
      JSON.stringify(DEMO_USER),
    );
  });

  it('rejects invalid credentials', async () => {
    const promise = login('wrong@example.com', 'wrong-password');
    const assertion = expect(promise).rejects.toThrow('Email atau password salah');
    await vi.advanceTimersByTimeAsync(500);

    await assertion;
    expect(getStoredUser()).toBeNull();
  });

  it('persists demo profile changes through logout and login', async () => {
    await runLogin();
    updateStoredUser({
      name: 'Andi Setiawan',
      initialBalance: 2_500_000,
      minBalance: 500_000,
    });
    logout();

    expect(getStoredUser()).toBeNull();

    const user = await runLogin();

    expect(user).toMatchObject({
      id: DEMO_USER.id,
      name: 'Andi Setiawan',
      initialBalance: 2_500_000,
      minBalance: 500_000,
    });
  });

  it('keeps registered accounts session-only', async () => {
    const registered = await runRegister();

    expect(registered.email).toBe('budi@example.com');
    expect(getStoredUser()?.id).toBe(registered.id);

    logout();

    expect(getStoredUser()).toBeNull();
  });

  it('ignores corrupted session data', () => {
    window.localStorage.setItem(STORAGE_KEYS.auth, '{invalid');

    expect(getStoredUser()).toBeNull();
  });
});
