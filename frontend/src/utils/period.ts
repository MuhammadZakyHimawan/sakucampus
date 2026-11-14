import type { PeriodPreset, PeriodRange } from '@/types';
import { toDate, toISODate } from './date';

const periodLabels: Record<PeriodPreset, string> = {
  '7d': '7 hari terakhir',
  '30d': '30 hari terakhir',
  month: 'Bulan ini',
};

export function getPeriodRange(
  preset: PeriodPreset,
  reference: Date = new Date(),
): PeriodRange {
  const end = new Date(reference);

  if (preset === 'month') {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: periodLabels[preset],
    };
  }

  const days = preset === '7d' ? 7 : 30;
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  return {
    start: toISODate(start),
    end: toISODate(end),
    label: periodLabels[preset],
  };
}

export function getPreviousPeriodRange(
  preset: PeriodPreset,
  reference: Date = new Date(),
): PeriodRange {
  if (preset === 'month') {
    const start = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    const end = new Date(reference.getFullYear(), reference.getMonth(), 0);

    return {
      start: toISODate(start),
      end: toISODate(end),
      label: 'Bulan sebelumnya',
    };
  }

  const days = preset === '7d' ? 7 : 30;
  const currentStart = toDate(getPeriodRange(preset, reference).start);
  const end = new Date(currentStart);
  end.setDate(currentStart.getDate() - 1);

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  return {
    start: toISODate(start),
    end: toISODate(end),
    label: `${days} hari sebelumnya`,
  };
}

export function getMonthRange(reference: Date = new Date()): PeriodRange {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);

  return {
    start: toISODate(start),
    end: toISODate(end),
    label: 'Bulan ini',
  };
}

export function isWithinRange(date: string, range: PeriodRange): boolean {
  const value = date.slice(0, 10);
  return value >= range.start && value <= range.end;
}
