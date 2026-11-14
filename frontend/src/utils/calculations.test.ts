import type { Budget, Goal, Transaction } from '@/types';
import { describe, expect, it } from 'vitest';
import {
  buildCashflowSeries,
  computeBalance,
  computeBudgetUsage,
  computeBurnRate,
  computeGoalProgress,
  getBudgetStatus,
  getTotalByType,
  groupExpensesByCategory,
  isGoalAchieved,
} from './calculations';

function transaction(
  overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount'>,
): Transaction {
  return {
    description: 'Transaksi uji',
    category: overrides.type === 'income' ? 'Uang Saku' : 'Gaya Hidup',
    date: '2026-05-10',
    source: 'manual',
    ...overrides,
  };
}

const transactions: Transaction[] = [
  transaction({ id: 'trx-1', type: 'income', amount: 1_000_000 }),
  transaction({
    id: 'trx-2',
    type: 'expense',
    amount: 250_000,
    category: 'Gaya Hidup',
  }),
  transaction({
    id: 'trx-3',
    type: 'expense',
    amount: 150_000,
    category: 'Gaya Hidup',
  }),
  transaction({
    id: 'trx-4',
    type: 'expense',
    amount: 100_000,
    category: 'Transportasi',
    date: '2026-05-11',
  }),
];

describe('calculation utilities', () => {
  it('totals transactions and computes balance', () => {
    expect(getTotalByType(transactions, 'income')).toBe(1_000_000);
    expect(getTotalByType(transactions, 'expense')).toBe(500_000);
    expect(computeBalance(2_000_000, transactions)).toBe(2_500_000);
  });

  it('computes goal progress and achievement', () => {
    const goal: Goal = {
      id: 'goal-1',
      name: 'Dana Darurat',
      targetAmount: 1_000_000,
      savedAmount: 550_000,
      deadline: '2026-12-31',
    };

    expect(computeGoalProgress(goal)).toBe(55);
    expect(isGoalAchieved(goal)).toBe(false);
    expect(computeGoalProgress({ ...goal, savedAmount: 1_500_000 })).toBe(100);
    expect(isGoalAchieved({ ...goal, savedAmount: 1_000_000 })).toBe(true);
    expect(computeGoalProgress({ ...goal, targetAmount: 0 })).toBe(0);
  });

  it('filters budget usage by type, category, and period', () => {
    const budget: Budget = {
      id: 'budget-1',
      category: 'Gaya Hidup',
      limit: 500_000,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
    };

    expect(computeBudgetUsage(budget, transactions)).toBe(400_000);
  });

  it('maps budget usage to status thresholds', () => {
    expect(getBudgetStatus(0, 100)).toBe('safe');
    expect(getBudgetStatus(74, 100)).toBe('safe');
    expect(getBudgetStatus(75, 100)).toBe('warning');
    expect(getBudgetStatus(100, 100)).toBe('exceeded');
    expect(getBudgetStatus(50, 0)).toBe('safe');
  });

  it('computes burn rate and groups expenses by category', () => {
    expect(computeBurnRate(transactions, '2026-05-01', '2026-05-10')).toBe(
      50_000,
    );
    expect(groupExpensesByCategory(transactions)).toEqual([
      { category: 'Gaya Hidup', total: 400_000 },
      { category: 'Transportasi', total: 100_000 },
    ]);
  });

  it('builds a daily cashflow series for short periods', () => {
    const range = {
      start: '2026-05-10',
      end: '2026-05-11',
      label: '7 hari terakhir',
    };
    const series = buildCashflowSeries(transactions, range, '7d');

    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ income: 1_000_000, expense: 400_000 });
    expect(series[1]).toMatchObject({ income: 0, expense: 100_000 });
  });
});
