import { CSRF_COOKIE_NAME, STORAGE_KEYS } from '@/lib/config';

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(prefix.length);

  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function clearStoredUser(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.auth);
  } catch {
    return;
  }
}
