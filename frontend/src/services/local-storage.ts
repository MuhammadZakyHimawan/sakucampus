export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function readJson<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  createDefault: () => T,
): T {
  try {
    const stored = window.localStorage.getItem(key);

    if (stored) {
      const parsed: unknown = JSON.parse(stored);

      if (isValid(parsed)) {
        return parsed;
      }
    }
  } catch {
    const fallback = createDefault();
    writeJson(key, fallback);

    return fallback;
  }

  const fallback = createDefault();
  writeJson(key, fallback);

  return fallback;
}
