import { isMockApiEnabled } from '@/lib/config';
import type {
  Budget,
  BudgetOverviewItem,
  CashflowPoint,
  CategoryTotal,
  DashboardData,
  DashboardSummary,
  FinancialInsight,
  FinancialStatus,
  Goal,
  PeriodPreset,
  PeriodRange,
  ReportData,
  ReportPeriodPreset,
  ReportSummary,
  RuleAlert,
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
import {
  getPeriodRange,
  getPreviousPeriodRange,
  isWithinRange,
} from '@/utils/period';
import { apiDownloadBlob, apiRequest } from './api-client';
import type { DownloadedBlob } from './api-client';

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

interface BackendDashboardResponse {
  period: PeriodPreset;
  range: PeriodRange;
  summary: {
    balance: number;
    minBalance: number;
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    dailyBurnRate: number;
    runwayDays: number | null;
    safeDailySpend: number;
    financialStatus: FinancialStatus;
  };
  cashflow: CashflowPoint[];
  categories: CategoryTotal[];
  budgets: BudgetOverviewItem[];
  goals: Goal[];
  insights: FinancialInsight[];
  ruleAlerts: RuleAlert[];
  recentTransactions: Transaction[];
  transactionCount: number;
}

export interface ReportPdfQueryParams {
  preset?: ReportPeriodPreset;
  startDate?: string;
  endDate?: string;
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

export async function fetchDashboardSummary(
  preset: PeriodPreset,
  customRange?: { startDate?: string; endDate?: string },
): Promise<DashboardData> {
  const raw = await apiRequest<BackendDashboardResponse>('/analytics/summary', {
    params: {
      preset: customRange?.startDate ? undefined : preset,
      start_date: customRange?.startDate,
      end_date: customRange?.endDate,
    },
  });

  return {
    period: raw.period,
    range: raw.range,
    summary: {
      balance: raw.summary.balance,
      minBalance: raw.summary.minBalance,
      income: raw.summary.totalIncome,
      expense: raw.summary.totalExpense,
      net: raw.summary.netCashFlow,
      burnRate: raw.summary.dailyBurnRate,
      runwayDays: raw.summary.runwayDays,
      safeDailySpend: raw.summary.safeDailySpend,
      financialStatus: raw.summary.financialStatus,
    },
    cashflow: raw.cashflow,
    categories: raw.categories,
    budgets: raw.budgets,
    goals: raw.goals,
    insights: raw.insights,
    ruleAlerts: raw.ruleAlerts,
    recentTransactions: raw.recentTransactions,
    transactionCount: raw.transactionCount,
  };
}

export async function fetchReportAnalytics(
  preset: PeriodPreset,
  customRange?: { startDate?: string; endDate?: string },
): Promise<ReportData> {
  return apiRequest<ReportData>('/analytics/report', {
    params: {
      preset: customRange?.startDate ? undefined : preset,
      start_date: customRange?.startDate,
      end_date: customRange?.endDate,
    },
  });
}

export async function fetchReportPdf(
  params: ReportPdfQueryParams,
): Promise<DownloadedBlob> {
  if (isMockApiEnabled()) {
    throw new Error(
      'Ekspor PDF memerlukan koneksi ke server backend FastAPI (mode live).',
    );
  }

  return apiDownloadBlob('/reports/pdf', {
    preset: params.startDate && params.endDate ? undefined : (params.preset ?? '30d'),
    start_date: params.startDate,
    end_date: params.endDate,
  });
}

export async function previewReportPdf(
  params: ReportPdfQueryParams,
): Promise<string> {
  const { blob, filename } = await fetchReportPdf(params);
  const blobUrl = URL.createObjectURL(blob);
  const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');

  if (!opened) {
    // Fallback bila pop-up diblokir browser: unduh langsung
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60_000);

  return filename;
}

export async function downloadReportPdf(
  params: ReportPdfQueryParams,
): Promise<string> {
  const { blob, filename } = await fetchReportPdf(params);
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 5_000);

  return filename;
}
