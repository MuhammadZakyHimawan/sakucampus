import { describe, expect, it } from 'vitest';
import {
  getMonthRange,
  getPeriodRange,
  getPreviousPeriodRange,
  isWithinRange,
} from './period';

const reference = new Date(2026, 4, 15);

describe('period utilities', () => {
  it('builds rolling period ranges inclusively', () => {
    expect(getPeriodRange('7d', reference)).toEqual({
      start: '2026-05-09',
      end: '2026-05-15',
      label: '7 hari terakhir',
    });
    expect(getPeriodRange('30d', reference)).toEqual({
      start: '2026-04-16',
      end: '2026-05-15',
      label: '30 hari terakhir',
    });
  });

  it('uses the reference date as the end of the current month period', () => {
    expect(getPeriodRange('month', reference)).toEqual({
      start: '2026-05-01',
      end: '2026-05-15',
      label: 'Bulan ini',
    });
  });

  it('builds the previous range for rolling and monthly periods', () => {
    expect(getPreviousPeriodRange('7d', reference)).toEqual({
      start: '2026-05-02',
      end: '2026-05-08',
      label: '7 hari sebelumnya',
    });
    expect(getPreviousPeriodRange('month', reference)).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
      label: 'Bulan sebelumnya',
    });
  });

  it('builds a full month range', () => {
    expect(getMonthRange(reference)).toEqual({
      start: '2026-05-01',
      end: '2026-05-31',
      label: 'Bulan ini',
    });
  });

  it('checks ISO dates with timestamps against a range', () => {
    const range = getPeriodRange('month', reference);

    expect(isWithinRange('2026-05-01T10:00:00', range)).toBe(true);
    expect(isWithinRange('2026-05-15', range)).toBe(true);
    expect(isWithinRange('2026-05-16', range)).toBe(false);
  });
});
