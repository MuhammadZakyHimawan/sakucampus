export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionSource = 'manual' | 'telegram';

export type ExpenseCategory =
  | 'Kebutuhan Primer'
  | 'Gaya Hidup'
  | 'Pendidikan'
  | 'Transportasi'
  | 'Kesehatan'
  | 'Tagihan'
  | 'Lainnya';

export type IncomeCategory =
  | 'Uang Saku'
  | 'Beasiswa'
  | 'Gaji/Part-time'
  | 'Hadiah'
  | 'Lainnya';

export type TransactionCategory = ExpenseCategory | IncomeCategory;
export type BudgetStatus = 'safe' | 'warning' | 'exceeded';
export type NotificationType = 'budget' | 'balance' | 'goal' | 'info';
export type NotificationSeverity = 'normal' | 'warning' | 'critical';
export type FinancialStatus = 'normal' | 'warning' | 'critical';
export type PeriodPreset = '7d' | '30d' | 'month';
export type ReportPeriodPreset = '7d' | '30d' | 'month' | 'all';
export type TelegramMode = 'polling' | 'webhook' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  initialBalance: number;
  minBalance: number;
  avatarUrl?: string | null;
}

export interface AuthSessionResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string;
  source: TransactionSource;
  note?: string | null;
  rawText?: string | null;
  nlpConfidence?: number | null;
}

export interface TransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string;
  source: TransactionSource;
  note?: string;
}

export interface Budget {
  id: string;
  category: ExpenseCategory;
  limit: number;
  periodStart: string;
  periodEnd: string;
}

export interface BudgetInput {
  category: ExpenseCategory;
  limit: number;
  periodStart: string;
  periodEnd: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  deadline: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  ruleCode?: string | null;
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string | null;
  sentToTelegram?: boolean;
}

export interface RuleAlert {
  ruleCode: string;
  notificationType: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  dedupKey: string;
  link: string;
}

export interface EducationArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  readMinutes: number;
}

export interface FinanceSettings {
  initialBalance: number;
  minBalance: number;
  currency: string;
  period: PeriodPreset;
  notifyBudget: boolean;
  notifyBalance: boolean;
  notifyGoal: boolean;
}

export interface FinancePreferences {
  period: PeriodPreset;
  notifyBudget: boolean;
  notifyBalance: boolean;
  notifyGoal: boolean;
}

export interface TelegramStatus {
  connected: boolean;
  username?: string;
  telegramUsername?: string | null;
  telegramUserId?: string | null;
  linkedAt?: string | null;
  botUsername?: string | null;
  botConfigured?: boolean;
  mode?: TelegramMode;
  simulated?: boolean;
}

export interface TelegramLinkTokenResponse {
  token: string;
  expiresAt: string;
  deepLink?: string | null;
  startCommand: string;
}

export interface PeriodRange {
  start: string;
  end: string;
  label: string;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface DashboardSummary {
  balance: number;
  minBalance: number;
  income: number;
  expense: number;
  net: number;
  burnRate: number;
  runwayDays?: number | null;
  safeDailySpend?: number;
  financialStatus?: FinancialStatus;
}

export interface CashflowPoint {
  key: string;
  label: string;
  rangeLabel: string;
  income: number;
  expense: number;
}

export interface BudgetOverviewItem {
  budget: Budget;
  used: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export type InsightTone = 'positive' | 'warning' | 'danger' | 'info';

export interface FinancialInsight {
  id: string;
  tone: InsightTone;
  title: string;
  description: string;
}

export interface DashboardData {
  period: PeriodPreset;
  range: PeriodRange;
  summary: DashboardSummary;
  cashflow: CashflowPoint[];
  categories: CategoryTotal[];
  budgets: BudgetOverviewItem[];
  goals?: Goal[];
  insights: FinancialInsight[];
  ruleAlerts?: RuleAlert[];
  recentTransactions: Transaction[];
  transactionCount: number;
}

export interface ReportSummary {
  income: number;
  expense: number;
  net: number;
  dailyAverageExpense: number;
  transactionCount: number;
}

export interface ReportComparison {
  previous: ReportSummary;
  incomeChange: number | null;
  expenseChange: number | null;
  netChange: number | null;
}

export interface ReportData {
  range: PeriodRange;
  previousRange: PeriodRange;
  balance?: number;
  minBalance?: number;
  dailyBurnRate?: number;
  runwayDays?: number | null;
  safeDailySpend?: number;
  financialStatus?: FinancialStatus;
  summary: ReportSummary;
  comparison: ReportComparison;
  cashflow: CashflowPoint[];
  categories: CategoryTotal[];
  budgets?: BudgetOverviewItem[];
  goals?: Goal[];
  ruleAlerts?: RuleAlert[];
  transactions: Transaction[];
}
