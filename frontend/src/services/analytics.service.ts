import { MOCK_API_ENABLED } from '@/lib/config';
import type {
  Budget,
  BudgetOverviewItem,
  CategoryTotal,
  DashboardData,
  DashboardSummary,
  FinancialInsight,
  PeriodPreset,
  ReportData,
  ReportSummary,
  Transaction,
  User,
} from '@/types';
import {
  buildCashflowSeries,
  computeBalance,
  computeBudgetUsage,
  computeBurnRate,
  getBudgetStatus,
  getTotalByType,
  groupExpensesByCategory,
} from '@/utils/calculations';
import { formatCurrency } from '@/utils/currency';
import { toISODate } from '@/utils/date';
import { getPeriodRange, getPreviousPeriodRange, isWithinRange } from '@/utils/period';
import { apiRequest } from './api-client';

export interface DashboardDataInput {
  user: User;
  transactions: Transaction[];
  budgets: Budget[];
  preset: PeriodPreset;
  reference?: Date;
}

interface InsightInput {
  summary: DashboardSummary;
  categories: CategoryTotal[];
  previousTransactions: Transaction[];
  budgets: BudgetOverviewItem[];
  hasTransactions: boolean;
}

function buildBudgetOverview(
  budgets: Budget[],
  transactions: Transaction[],
): BudgetOverviewItem[] {
  return budgets
    .map((budget) => {
      const used = computeBudgetUsage(budget, transactions);
      const percentage =
        budget.limit > 0 ? Math.round((used / budget.limit) * 100) : 0;

      return {
        budget,
        used,
        remaining: budget.limit - used,
        percentage,
        status: getBudgetStatus(used, budget.limit),
      };
    })
    .sort((first, second) => second.percentage - first.percentage);
}

function buildInsights({
  summary,
  categories,
  previousTransactions,
  budgets,
  hasTransactions,
}: InsightInput): FinancialInsight[] {
  if (!hasTransactions) {
    return [];
  }

  const insights: FinancialInsight[] = [];
  const highlightedBudget =
    budgets.find((item) => item.status === 'exceeded') ??
    budgets.find((item) => item.status === 'warning');

  if (highlightedBudget) {
    const isExceeded = highlightedBudget.status === 'exceeded';

    insights.push({
      id: `budget-${highlightedBudget.budget.id}`,
      tone: isExceeded ? 'danger' : 'warning',
      title: `Anggaran ${highlightedBudget.budget.category} ${
        isExceeded ? 'terlampaui' : 'hampir habis'
      }`,
      description: `Sudah terpakai ${highlightedBudget.percentage}% dari batas ${formatCurrency(
        highlightedBudget.budget.limit,
      )} bulan ini.`,
    });
  }

  const previousCategories = groupExpensesByCategory(previousTransactions);
  const previousTotals = new Map(
    previousCategories.map((item) => [item.category, item.total]),
  );
  const increasingCategory = categories
    .map((category) => {
      const previous = previousTotals.get(category.category) ?? 0;
      const change =
        previous > 0 ? ((category.total - previous) / previous) * 100 : 0;

      return {
        ...category,
        previous,
        change,
      };
    })
    .filter((item) => item.previous > 0 && item.change >= 15)
    .sort((first, second) => second.change - first.change)[0];

  if (increasingCategory) {
    insights.push({
      id: `trend-${increasingCategory.category}`,
      tone: 'warning',
      title: `${increasingCategory.category} meningkat`,
      description: `Pengeluaran ${increasingCategory.category.toLowerCase()} naik ${Math.round(
        increasingCategory.change,
      )}% dibanding periode sebelumnya.`,
    });
  }

  if (summary.net > 0) {
    insights.push({
      id: 'net-positive',
      tone: 'positive',
      title: 'Kamu berhasil menyisihkan',
      description: `Kamu menyisihkan ${formatCurrency(
        summary.net,
      )} pada periode ini.`,
    });
  } else if (summary.net < 0) {
    insights.push({
      id: 'net-negative',
      tone: 'danger',
      title: 'Pengeluaran lebih besar',
      description: `Pengeluaran melebihi pemasukan sebesar ${formatCurrency(
        Math.abs(summary.net),
      )} pada periode ini.`,
    });
  }

  if (insights.length < 3 && categories[0]) {
    insights.push({
      id: 'top-category',
      tone: 'info',
      title: `Kategori terbesar: ${categories[0].category}`,
      description: `Pengeluaran terbesar periode ini ada di ${
        categories[0].category
      } sebesar ${formatCurrency(categories[0].total)}.`,
    });
  }

  return insights.slice(0, 3);
}

function buildReportSummary(
  transactions: Transaction[],
  start: string,
  end: string,
): ReportSummary {
  const income = getTotalByType(transactions, 'income');
  const expense = getTotalByType(transactions, 'expense');

  return {
    income,
    expense,
    net: income - expense,
    dailyAverageExpense: computeBurnRate(transactions, start, end),
    transactionCount: transactions.length,
  };
}

function computeChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

export interface ReportDataInput {
  transactions: Transaction[];
  preset: PeriodPreset;
  reference?: Date;
}

export function buildReportData({
  transactions,
  preset,
  reference = new Date(),
}: ReportDataInput): ReportData {
  const range = getPeriodRange(preset, reference);
  const previousRange = getPreviousPeriodRange(preset, reference);
  const periodTransactions = transactions.filter((transaction) =>
    isWithinRange(transaction.date, range),
  );
  const previousTransactions = transactions.filter((transaction) =>
    isWithinRange(transaction.date, previousRange),
  );
  const summary = buildReportSummary(
    periodTransactions,
    range.start,
    range.end,
  );
  const previous = buildReportSummary(
    previousTransactions,
    previousRange.start,
    previousRange.end,
  );

  return {
    range,
    previousRange,
    summary,
    comparison: {
      previous,
      incomeChange: computeChange(summary.income, previous.income),
      expenseChange: computeChange(summary.expense, previous.expense),
      netChange: computeChange(summary.net, previous.net),
    },
    cashflow: buildCashflowSeries(periodTransactions, range, preset),
    categories: groupExpensesByCategory(periodTransactions),
    transactions: [...periodTransactions].sort((first, second) =>
      second.date.localeCompare(first.date),
    ),
  };
}

export function buildDashboardData({
  user,
  transactions,
  budgets,
  preset,
  reference = new Date(),
}: DashboardDataInput): DashboardData {
  const range = getPeriodRange(preset, reference);
  const previousRange = getPreviousPeriodRange(preset, reference);
  const periodTransactions = transactions.filter((transaction) =>
    isWithinRange(transaction.date, range),
  );
  const previousTransactions = transactions.filter((transaction) =>
    isWithinRange(transaction.date, previousRange),
  );
  const income = getTotalByType(periodTransactions, 'income');
  const expense = getTotalByType(periodTransactions, 'expense');
  const summary: DashboardSummary = {
    balance: computeBalance(user.initialBalance, transactions),
    minBalance: user.minBalance,
    income,
    expense,
    net: income - expense,
    burnRate: computeBurnRate(periodTransactions, range.start, range.end),
  };
  const categories = groupExpensesByCategory(periodTransactions);
  const budgetOverview = buildBudgetOverview(budgets, transactions);
  const insights = buildInsights({
    summary,
    categories,
    previousTransactions,
    budgets: budgetOverview,
    hasTransactions: periodTransactions.length > 0,
  });
  const recentTransactions = [...periodTransactions]
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 6);

  return {
    period: preset,
    range,
    summary,
    cashflow: buildCashflowSeries(periodTransactions, range, preset),
    categories,
    budgets: budgetOverview,
    insights,
    recentTransactions,
    transactionCount: periodTransactions.length,
  };
}

function analyticsQuery(input: { preset: PeriodPreset; reference?: Date }): string {
  const params = new URLSearchParams({ preset: input.preset });
  if (input.reference) {
    params.set('reference', toISODate(input.reference));
  }
  return params.toString();
}

export function fetchDashboardData(input: DashboardDataInput): Promise<DashboardData> {
  if (MOCK_API_ENABLED) {
    return Promise.resolve(buildDashboardData(input));
  }

  return apiRequest<DashboardData>(
    `/analytics/dashboard?${analyticsQuery(input)}`,
  );
}

export function fetchReportData(input: ReportDataInput): Promise<ReportData> {
  if (MOCK_API_ENABLED) {
    return Promise.resolve(buildReportData(input));
  }

  return apiRequest<ReportData>(`/analytics/report?${analyticsQuery(input)}`);
}
