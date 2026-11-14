import type { Goal } from '@/types';
import { toISODate } from '@/utils/date';

const today = new Date();

function inDays(days: number): string {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export const mockGoals: Goal[] = [
  {
    id: 'goal-001',
    name: 'Dana Darurat',
    targetAmount: 5_000_000,
    savedAmount: 2_100_000,
    deadline: inDays(90),
  },
  {
    id: 'goal-002',
    name: 'Laptop Kuliah',
    targetAmount: 8_000_000,
    savedAmount: 3_200_000,
    deadline: inDays(150),
  },
  {
    id: 'goal-003',
    name: 'Biaya Kuliah Semester Depan',
    targetAmount: 4_000_000,
    savedAmount: 1_000_000,
    deadline: inDays(60),
  },
  {
    id: 'goal-004',
    name: 'Liburan Semester',
    targetAmount: 1_500_000,
    savedAmount: 1_500_000,
    deadline: inDays(30),
  },
];
