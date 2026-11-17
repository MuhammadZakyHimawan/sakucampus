import { DEFAULT_CURRENCY, MOCK_API_ENABLED, STORAGE_KEYS } from '@/lib/config';
import { DEMO_CREDENTIALS, DEMO_USER } from '@/mocks/users';
import type { RegisterInput, User } from '@/types';
import { apiRequest } from './api-client';
import {
  clearStoredToken,
  getStoredToken,
  storeToken,
} from './session-storage';

const MOCK_DELAY = 500;

let mockPassword: string = DEMO_CREDENTIALS.password;

export type UserUpdate = Partial<
  Pick<
    User,
    'name' | 'email' | 'initialBalance' | 'minBalance' | 'currency' | 'avatarUrl'
  >
>;

interface AuthResponsePayload {
  accessToken: string;
  expiresIn: number;
  user: unknown;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function normalizeUser(value: unknown): User | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Partial<User> & { avatarUrl?: unknown };

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.email !== 'string' ||
    typeof candidate.name !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    currency:
      typeof candidate.currency === 'string'
        ? candidate.currency
        : DEFAULT_CURRENCY,
    initialBalance:
      typeof candidate.initialBalance === 'number'
        ? candidate.initialBalance
        : 0,
    minBalance:
      typeof candidate.minBalance === 'number' ? candidate.minBalance : 0,
    avatarUrl:
      typeof candidate.avatarUrl === 'string' && candidate.avatarUrl.trim()
        ? candidate.avatarUrl
        : undefined,
  };
}

function requireUser(value: unknown): User {
  const user = normalizeUser(value);

  if (!user) {
    throw new Error('Respons pengguna dari server tidak valid.');
  }

  return user;
}

function parseStoredUser(stored: string | null): User | null {
  try {
    if (!stored) {
      return null;
    }

    return normalizeUser(JSON.parse(stored) as unknown);
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

function writeStoredUser(user: User): void {
  window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(user));

  if (user.id === DEMO_USER.id) {
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(user));
  }
}

function getStoredDemoProfile(): User | null {
  const profile = readStoredUser(STORAGE_KEYS.profile);

  return profile?.id === DEMO_USER.id ? profile : null;
}

function applyUpdates(current: User, updates: UserUpdate): User {
  const avatarUrl =
    updates.avatarUrl === undefined
      ? current.avatarUrl
      : updates.avatarUrl.trim()
        ? updates.avatarUrl.trim()
        : undefined;

  return {
    ...current,
    ...updates,
    name: updates.name?.trim() ? updates.name.trim() : current.name,
    email: updates.email?.trim()
      ? updates.email.trim().toLowerCase()
      : current.email,
    avatarUrl,
  };
}

function persistSession(payload: AuthResponsePayload): User {
  if (typeof payload.accessToken !== 'string' || !payload.accessToken) {
    throw new Error('Token akses dari server tidak valid.');
  }

  const user = requireUser(payload.user);

  storeToken(payload.accessToken);
  writeStoredUser(user);

  return user;
}

export async function login(email: string, password: string): Promise<User> {
  if (!MOCK_API_ENABLED) {
    const payload = await apiRequest<AuthResponsePayload>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    return persistSession(payload);
  }

  await wait(MOCK_DELAY);

  const normalizedEmail = email.trim().toLowerCase();
  const isValid =
    normalizedEmail === DEMO_CREDENTIALS.email && password === mockPassword;

  if (!isValid) {
    throw new Error(
      'Email atau password salah. Gunakan akun demo yang tersedia.',
    );
  }

  const storedProfile = getStoredDemoProfile();
  const sessionUser = storedProfile ?? DEMO_USER;

  writeStoredUser(sessionUser);
  return sessionUser;
}

export async function register(input: RegisterInput): Promise<User> {
  if (!MOCK_API_ENABLED) {
    const payload = await apiRequest<AuthResponsePayload>('/auth/register', {
      method: 'POST',
      body: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
      },
    });

    return persistSession(payload);
  }

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
  if (!MOCK_API_ENABLED) {
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }

  clearStoredToken();
  window.localStorage.removeItem(STORAGE_KEYS.auth);
}

export function getStoredUser(): User | null {
  if (!MOCK_API_ENABLED && !getStoredToken()) {
    return null;
  }

  return readStoredUser(STORAGE_KEYS.auth);
}

export function updateStoredUser(updates: UserUpdate): User {
  const current = getStoredUser() ?? getStoredDemoProfile() ?? DEMO_USER;
  const updated = applyUpdates(current, updates);

  writeStoredUser(updated);
  return updated;
}

export async function updateProfile(updates: UserUpdate): Promise<User> {
  if (MOCK_API_ENABLED) {
    return updateStoredUser(updates);
  }

  const profilePayload: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    profilePayload.name = updates.name.trim();
  }

  if (updates.email !== undefined) {
    profilePayload.email = updates.email.trim().toLowerCase();
  }

  if (updates.avatarUrl !== undefined) {
    profilePayload.avatarUrl = updates.avatarUrl.trim() || null;
  }

  const serverUser =
    Object.keys(profilePayload).length > 0
      ? requireUser(
          await apiRequest<unknown>('/auth/me', {
            method: 'PATCH',
            body: profilePayload,
          }),
        )
      : null;
  const current = serverUser ?? getStoredUser() ?? getStoredDemoProfile();

  if (!current) {
    throw new Error('Sesi pengguna tidak ditemukan.');
  }

  const updated = applyUpdates(current, updates);

  writeStoredUser(updated);
  return updated;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!MOCK_API_ENABLED) {
    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });

    return;
  }

  await wait(MOCK_DELAY);

  if (currentPassword !== mockPassword) {
    throw new Error('Password saat ini salah.');
  }

  mockPassword = newPassword;
}
