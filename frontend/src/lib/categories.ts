import type {
  BudgetStatus,
  ExpenseCategory,
  IncomeCategory,
  TransactionType,
} from '@/types';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Kebutuhan Primer',
  'Gaya Hidup',
  'Pendidikan',
  'Transportasi',
  'Kesehatan',
  'Tagihan',
  'Lainnya',
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Uang Saku',
  'Beasiswa',
  'Gaji/Part-time',
  'Hadiah',
  'Lainnya',
];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  safe: 'Aman',
  warning: 'Waspada',
  exceeded: 'Melebihi',
};
