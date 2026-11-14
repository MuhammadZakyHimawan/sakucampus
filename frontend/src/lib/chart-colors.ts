import type { ExpenseCategory } from '@/types';

export const CASHFLOW_COLORS = {
  income: 'rgb(var(--color-success))',
  expense: 'rgb(var(--color-danger))',
} as const;

const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Kebutuhan Primer': 'rgb(var(--color-primary))',
  'Gaya Hidup': 'rgb(var(--color-gold))',
  Pendidikan: 'rgb(var(--color-info))',
  Transportasi: 'rgb(var(--color-success))',
  Kesehatan: 'rgb(var(--color-warning))',
  Tagihan: 'rgb(var(--color-danger))',
  Lainnya: 'rgb(var(--color-text-secondary))',
};

export function getCategoryColor(category: string): string {
  return (
    EXPENSE_CATEGORY_COLORS[category as ExpenseCategory] ??
    'rgb(var(--color-text-secondary))'
  );
}
