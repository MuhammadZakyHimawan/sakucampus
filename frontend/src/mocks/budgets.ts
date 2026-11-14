import type { Budget } from '@/types';
import { getMonthRange } from '@/utils/period';

const currentMonth = getMonthRange();

export const mockBudgets: Budget[] = [
  {
    id: 'budget-001',
    category: 'Kebutuhan Primer',
    limit: 1_500_000,
    periodStart: currentMonth.start,
    periodEnd: currentMonth.end,
  },
  {
    id: 'budget-002',
    category: 'Gaya Hidup',
    limit: 300_000,
    periodStart: currentMonth.start,
    periodEnd: currentMonth.end,
  },
  {
    id: 'budget-003',
    category: 'Transportasi',
    limit: 250_000,
    periodStart: currentMonth.start,
    periodEnd: currentMonth.end,
  },
  {
    id: 'budget-004',
    category: 'Pendidikan',
    limit: 600_000,
    periodStart: currentMonth.start,
    periodEnd: currentMonth.end,
  },
  {
    id: 'budget-005',
    category: 'Kesehatan',
    limit: 200_000,
    periodStart: currentMonth.start,
    periodEnd: currentMonth.end,
  },
  {
    id: 'budget-006',
    category: 'Tagihan',
    limit: 300_000,
    periodStart: currentMonth.start,
    periodEnd: currentMonth.end,
  },
];
