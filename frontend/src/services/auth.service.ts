import { DEFAULT_CURRENCY, isMockApiEnabled, STORAGE_KEYS } from '@/lib/config';
import { DEMO_CREDENTIALS, DEMO_USER } from '@/mocks/users';
import type {
  AuthSessionResponse,
  ChangePasswordInput,
  RegisterInput,
  User,
} from '@/types';
import { apiRequest, getAccessToken, setAccessToken } from './api-client';

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
      avatarUrl: parsed.avatarUrl ?? undefined,
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

function persistSessionUser(user: User): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(user));
  } catch {
    // Abaikan bila penyimpanan lokal penuh/diblokir.
  }
}

function getStoredDemoProfile(): User | null {
  const profile = readStoredUser(STORAGE_KEYS.profile);

  return profile?.id === DEMO_USER.id ? profile : null;
}

export async function login(email: string, password: string): Promise<User> {
  if (!isMockApiEnabled()) {
    const response = await apiRequest<AuthSessionResponse>('/auth/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password },
      skipAuth: true,
    });
    setAccessToken(response.accessToken);
    persistSessionUser(response.user);
    return response.user;
  }

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

  persistSessionUser(sessionUser);
  window.localStorage.setItem(
    STORAGE_KEYS.profile,
    JSON.stringify(sessionUser),
  );
  return sessionUser;
}

export async function register(input: RegisterInput): Promise<User> {
  if (!isMockApiEnabled()) {
    const response = await apiRequest<AuthSessionResponse>('/auth/register', {
      method: 'POST',
      body: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
      },
      skipAuth: true,
    });
    setAccessToken(response.accessToken);
    persistSessionUser(response.user);
    return response.user;
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

  persistSessionUser(registeredUser);

  return registeredUser;
}

export async function fetchCurrentUser(): Promise<User> {
  if (isMockApiEnabled()) {
    const stored = getStoredUser();
    if (!stored) {
      throw new Error('Belum ada sesi aktif.');
    }
    return stored;
  }

  const user = await apiRequest<User>('/auth/me');
  persistSessionUser(user);
  return user;
}

export function logout(): void {
  if (!isMockApiEnabled() && getAccessToken()) {
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }
  setAccessToken(null);
  try {
    window.localStorage.removeItem(STORAGE_KEYS.auth);
  } catch {
    // Abaikan bila localStorage tidak tersedia.
  }
}

export function getStoredUser(): User | null {
  if (!isMockApiEnabled() && !getAccessToken()) {
    return null;
  }
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

  persistSessionUser(updated);

  if (updated.id === DEMO_USER.id) {
    window.localStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify(updated),
    );
  }

  return updated;
}

export async function updateProfile(updates: UserUpdate): Promise<User> {
  if (isMockApiEnabled()) {
    await wait(250);
    return updateStoredUser(updates);
  }

  const hasProfileFields =
    updates.name !== undefined ||
    updates.email !== undefined ||
    updates.avatarUrl !== undefined;
  const hasFinanceFields =
    updates.initialBalance !== undefined ||
    updates.minBalance !== undefined ||
    updates.currency !== undefined;

  let latestUser: User | null = null;

  if (hasFinanceFields) {
    await apiRequest('/settings/finance', {
      method: 'PATCH',
      body: {
        initialBalance: updates.initialBalance,
        minBalance: updates.minBalance,
        currency: updates.currency,
      },
    });
  }

  if (hasProfileFields) {
    latestUser = await apiRequest<User>('/users/me', {
      method: 'PATCH',
      body: {
        name: updates.name,
        email: updates.email,
        avatarUrl: updates.avatarUrl ?? null,
      },
    });
  } else {
    latestUser = await apiRequest<User>('/auth/me');
  }

  persistSessionUser(latestUser);
  return latestUser;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  if (isMockApiEnabled()) {
    await wait(400);
    return;
  }

  await apiRequest<void>('/auth/change-password', {
    method: 'POST',
    body: input,
  });
}
