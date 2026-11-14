import type { Budget, Transaction, User } from '@/types';
import { describe, expect, it } from 'vitest';
import { buildDashboardData, buildReportData } from './analytics.service';

const reference = new Date(2026, 4, 15);

const transactions: Transaction[] = [
  {
    id: 'trx-1',
    description: 'Uang saku',
    amount: 1_000_000,
    type: 'income',
    category: 'Uang Saku',
    date: '2026-05-02',
    source: 'manual',
  },
  {
    id: 'trx-2',
    description: 'Nongkrong',
    amount: 300_000,
    type: 'expense',
    category: 'Gaya Hidup',
    date: '2026-05-03',
    source: 'manual',
  },
  {
    id: 'trx-3',
    description: 'Belanja',
    amount: 100_000,
    type: 'expense',
    category: 'Kebutuhan Primer',
    date: '2026-05-10',
    source: 'manual',
  },
  {
    id: 'trx-4',
    description: 'Nonton',
    amount: 200_000,
    type: 'expense',
    category: 'Gaya Hidup',
    date: '2026-04-20',
    source: 'manual',
  },
  {
    id: 'trx-5',
    description: 'Bonus',
    amount: 999_000,
    type: 'income',
    category: 'Hadiah',
    date: '2026-06-01',
    source: 'manual',
  },
];

const user: User = {
  id: 'user-1',
  name: 'Andi',
  email: 'andi@example.com',
  currency: 'IDR',
  initialBalance: 5_000_000,
  minBalance: 1_000_000,
};

const budgets: Budget[] = [
  {
    id: 'budget-1',
    category: 'Gaya Hidup',
    limit: 400_000,
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
  },
];

describe('analytics service', () => {
  it('builds report data for the selected period', () => {
    const report = buildReportData({
      transactions,
      preset: 'month',
      reference,
    });

    expect(report.range).toEqual({
      start: '2026-05-01',
      end: '2026-05-15',
      label: 'Bulan ini',
    });
    expect(report.summary).toEqual({
      income: 1_000_000,
      expense: 400_000,
      net: 600_000,
      dailyAverageExpense: 26_667,
      transactionCount: 3,
    });
    expect(report.previousRange.start).toBe('2026-04-01');
    expect(report.comparison.previous.expense).toBe(200_000);
    expect(report.comparison.expenseChange).toBe(100);
    expect(report.comparison.incomeChange).toBeNull();
    expect(report.categories).toEqual([
      { category: 'Gaya Hidup', total: 300_000 },
      { category: 'Kebutuhan Primer', total: 100_000 },
    ]);
    expect(report.transactions.map((transaction) => transaction.id)).toEqual([
      'trx-3',
      'trx-2',
      'trx-1',
    ]);
  });

  it('builds dashboard data with balance, budgets, and insights', () => {
    const dashboard = buildDashboardData({
      user,
      transactions,
      budgets,
      preset: 'month',
      reference,
    });

    expect(dashboard.summary).toEqual({
      balance: 6_399_000,
      minBalance: 1_000_000,
      income: 1_000_000,
      expense: 400_000,
      net: 600_000,
      burnRate: 26_667,
    });
    expect(dashboard.transactionCount).toBe(3);
    expect(dashboard.recentTransactions).toHaveLength(3);
    expect(dashboard.categories[0]).toEqual({
      category: 'Gaya Hidup',
      total: 300_000,
    });
    expect(dashboard.budgets[0]).toMatchObject({
      used: 300_000,
      remaining: 100_000,
      percentage: 75,
      status: 'warning',
    });
    expect(dashboard.insights).toHaveLength(3);
    expect(dashboard.insights[0].id).toBe('budget-budget-1');
  });
});
