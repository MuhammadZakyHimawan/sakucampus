import {
  BUDGET_EXCEEDED_THRESHOLD,
  BUDGET_WARNING_THRESHOLD,
} from '@/lib/config';
import type {
  Budget,
  BudgetStatus,
  CashflowPoint,
  CategoryTotal,
  Goal,
  PeriodPreset,
  PeriodRange,
  Transaction,
  TransactionType,
} from '@/types';
import { daysInRange, formatShortDate, toDate, toISODate } from './date';
import { isWithinRange } from './period';

export function getTotalByType(
  transactions: Transaction[],
  type: TransactionType,
): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function computeBalance(
  initialBalance: number,
  transactions: Transaction[],
): number {
  return (
    initialBalance +
    getTotalByType(transactions, 'income') -
    getTotalByType(transactions, 'expense')
  );
}

export function computeGoalProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((goal.savedAmount / goal.targetAmount) * 100),
  );
}

export function isGoalAchieved(goal: Goal): boolean {
  return goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount;
}

export function computeBudgetUsage(
  budget: Budget,
  transactions: Transaction[],
): number {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        transaction.category === budget.category &&
        transaction.date.slice(0, 10) >= budget.periodStart &&
        transaction.date.slice(0, 10) <= budget.periodEnd,
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function getBudgetStatus(used: number, limit: number): BudgetStatus {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  if (percentage >= BUDGET_EXCEEDED_THRESHOLD) {
    return 'exceeded';
  }

  if (percentage >= BUDGET_WARNING_THRESHOLD) {
    return 'warning';
  }

  return 'safe';
}

export function computeBurnRate(
  transactions: Transaction[],
  start: string,
  end: string,
): number {
  const totalExpense = getTotalByType(transactions, 'expense');
  return Math.round(totalExpense / daysInRange(start, end));
}

export function groupExpensesByCategory(
  transactions: Transaction[],
): CategoryTotal[] {
  const totals = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      totals.set(
        transaction.category,
        (totals.get(transaction.category) ?? 0) + transaction.amount,
      );
    });

  return Array.from(totals, ([category, total]) => ({ category, total })).sort(
    (first, second) => second.total - first.total,
  );
}

export function buildCashflowSeries(
  transactions: Transaction[],
  range: PeriodRange,
  preset: PeriodPreset,
): CashflowPoint[] {
  const start = toDate(range.start);
  const end = toDate(range.end);
  const totalDays = daysInRange(range.start, range.end);
  const shouldGroupWeekly = preset !== '7d' && totalDays > 10;
  const points: CashflowPoint[] = [];

  if (shouldGroupWeekly) {
    const cursor = new Date(start);
    let index = 1;

    while (cursor <= end) {
      const bucketStart = new Date(cursor);
      const bucketEnd = new Date(cursor);
      bucketEnd.setDate(bucketEnd.getDate() + 6);

      if (bucketEnd > end) {
        bucketEnd.setTime(end.getTime());
      }

      const bucketRange: PeriodRange = {
        start: toISODate(bucketStart),
        end: toISODate(bucketEnd),
        label: '',
      };
      const bucketTransactions = transactions.filter((transaction) =>
        isWithinRange(transaction.date, bucketRange),
      );

      points.push({
        key: `week-${index}`,
        label: `Mgg ${index}`,
        rangeLabel: `${formatShortDate(bucketStart)} – ${formatShortDate(bucketEnd)}`,
        income: getTotalByType(bucketTransactions, 'income'),
        expense: getTotalByType(bucketTransactions, 'expense'),
      });

      cursor.setDate(cursor.getDate() + 7);
      index += 1;
    }

    return points;
  }

  const cursor = new Date(start);

  while (cursor <= end) {
    const isoDate = toISODate(cursor);
    const dayRange: PeriodRange = {
      start: isoDate,
      end: isoDate,
      label: '',
    };
    const dayTransactions = transactions.filter((transaction) =>
      isWithinRange(transaction.date, dayRange),
    );

    points.push({
      key: isoDate,
      label: formatShortDate(cursor),
      rangeLabel: formatShortDate(cursor),
      income: getTotalByType(dayTransactions, 'income'),
      expense: getTotalByType(dayTransactions, 'expense'),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}
