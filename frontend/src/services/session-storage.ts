import { STORAGE_KEYS } from '@/lib/config';

export function getStoredToken(): string | null {
  try {
    const token = window.localStorage.getItem(STORAGE_KEYS.token);

    return token && token.trim().length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.token, token);
  } catch {
    return;
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.token);
  } catch {
    return;
  }
}
