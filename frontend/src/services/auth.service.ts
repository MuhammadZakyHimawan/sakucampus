import { DEFAULT_CURRENCY, STORAGE_KEYS } from '@/lib/config';
import { DEMO_CREDENTIALS, DEMO_USER } from '@/mocks/users';
import type { RegisterInput, User } from '@/types';

const MOCK_DELAY = 500;

export type UserUpdate = Partial<
  Pick<
    User,
    'name' | 'email' | 'initialBalance' | 'minBalance' | 'currency' | 'avatarUrl'
  >
>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function parseStoredUser(stored: string | null): User | null {
  try {
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<User>;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string'
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      currency: parsed.currency ?? DEFAULT_CURRENCY,
      initialBalance:
        typeof parsed.initialBalance === 'number' ? parsed.initialBalance : 0,
      minBalance:
        typeof parsed.minBalance === 'number' ? parsed.minBalance : 0,
      avatarUrl: parsed.avatarUrl,
    };
  } catch {
    return null;
  }
}

function readStoredUser(key: string): User | null {
  try {
    return parseStoredUser(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function getStoredDemoProfile(): User | null {
  const profile = readStoredUser(STORAGE_KEYS.profile);

  return profile?.id === DEMO_USER.id ? profile : null;
}

export async function login(email: string, password: string): Promise<User> {
  await wait(MOCK_DELAY);

  const normalizedEmail = email.trim().toLowerCase();
  const isValid =
    normalizedEmail === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password;

  if (!isValid) {
    throw new Error(
      'Email atau password salah. Gunakan akun demo yang tersedia.',
    );
  }

  const storedProfile = getStoredDemoProfile();
  const sessionUser = storedProfile ?? DEMO_USER;

  window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(sessionUser));
  window.localStorage.setItem(
    STORAGE_KEYS.profile,
    JSON.stringify(sessionUser),
  );
  return sessionUser;
}

export async function register(input: RegisterInput): Promise<User> {
  await wait(MOCK_DELAY);

  const normalizedEmail = input.email.trim().toLowerCase();

  if (normalizedEmail === DEMO_CREDENTIALS.email) {
    throw new Error(
      'Email ini sudah digunakan oleh akun demo. Gunakan email lain.',
    );
  }

  const registeredUser: User = {
    id: `user-local-${Date.now()}`,
    name: input.name.trim(),
    email: normalizedEmail,
    currency: DEFAULT_CURRENCY,
    initialBalance: 0,
    minBalance: 0,
  };

  window.localStorage.setItem(
    STORAGE_KEYS.auth,
    JSON.stringify(registeredUser),
  );

  return registeredUser;
}

export function logout(): void {
  window.localStorage.removeItem(STORAGE_KEYS.auth);
}

export function getStoredUser(): User | null {
  return readStoredUser(STORAGE_KEYS.auth);
}

export function updateStoredUser(updates: UserUpdate): User {
  const current = getStoredUser() ?? getStoredDemoProfile() ?? DEMO_USER;
  const updated: User = {
    ...current,
    ...updates,
    name: updates.name?.trim() ? updates.name.trim() : current.name,
    email: updates.email?.trim()
      ? updates.email.trim().toLowerCase()
      : current.email,
  };

  window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(updated));

  if (updated.id === DEMO_USER.id) {
    window.localStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify(updated),
    );
  }

  return updated;
}
