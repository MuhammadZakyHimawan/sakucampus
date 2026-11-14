import { describe, expect, it } from 'vitest';
import { readJson, writeJson } from './local-storage';

interface Preferences {
  period: '7d' | 'month';
}

function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Preferences>;

  return candidate.period === '7d' || candidate.period === 'month';
}

describe('local storage helpers', () => {
  it('writes and reads valid JSON', () => {
    writeJson('test.preferences', { period: '7d' });

    expect(
      readJson('test.preferences', isPreferences, () => ({ period: 'month' })),
    ).toEqual({ period: '7d' });
  });

  it('writes the default when data is missing or invalid', () => {
    expect(
      readJson('test.missing', isPreferences, () => ({ period: 'month' })),
    ).toEqual({ period: 'month' });
    expect(window.localStorage.getItem('test.missing')).toBe(
      JSON.stringify({ period: 'month' }),
    );

    window.localStorage.setItem('test.invalid', JSON.stringify({ period: '30d' }));

    expect(
      readJson('test.invalid', isPreferences, () => ({ period: '7d' })),
    ).toEqual({ period: '7d' });
    expect(window.localStorage.getItem('test.invalid')).toBe(
      JSON.stringify({ period: '7d' }),
    );
  });

  it('recovers from malformed JSON', () => {
    window.localStorage.setItem('test.malformed', '{not-json');

    expect(
      readJson('test.malformed', isPreferences, () => ({ period: 'month' })),
    ).toEqual({ period: 'month' });
    expect(window.localStorage.getItem('test.malformed')).toBe(
      JSON.stringify({ period: 'month' }),
    );
  });
});
