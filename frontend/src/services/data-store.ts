import { STORAGE_KEYS } from '@/lib/config';
import { mockBudgets } from '@/mocks/budgets';
import { mockTransactions } from '@/mocks/transactions';
import type { Budget, Transaction } from '@/types';
import { toISODate } from '@/utils/date';

export interface FinanceDataset {
  transactions: Transaction[];
  budgets: Budget[];
  seededMonth: string;
}

export function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function currentMonth(): string {
  return toISODate(new Date()).slice(0, 7);
}

function createSeedDataset(): FinanceDataset {
  return {
    transactions: mockTransactions.map((transaction) => ({ ...transaction })),
    budgets: mockBudgets.map((budget) => ({ ...budget })),
    seededMonth: currentMonth(),
  };
}

function isTransactionLike(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Transaction>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.amount === 'number' &&
    (candidate.type === 'income' ||
      candidate.type === 'expense' ||
      candidate.type === 'transfer') &&
    typeof candidate.category === 'string' &&
    typeof candidate.date === 'string' &&
    (candidate.source === 'manual' || candidate.source === 'telegram')
  );
}

function isBudgetLike(value: unknown): value is Budget {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Budget>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.limit === 'number' &&
    typeof candidate.periodStart === 'string' &&
    typeof candidate.periodEnd === 'string'
  );
}

function isValidDataset(value: unknown): value is FinanceDataset {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<FinanceDataset>;

  return (
    Array.isArray(candidate.transactions) &&
    candidate.transactions.every(isTransactionLike) &&
    Array.isArray(candidate.budgets) &&
    candidate.budgets.every(isBudgetLike) &&
    typeof candidate.seededMonth === 'string'
  );
}

export function saveDataset(dataset: FinanceDataset): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(dataset));
  } catch {
    // Penyimpanan lokal tidak tersedia (mis. kuota habis atau mode privat).
    // Abaikan agar aplikasi tetap dapat berjalan pada sesi ini.
  }
}

export function loadDataset(): FinanceDataset {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.data);

    if (stored) {
      const parsed: unknown = JSON.parse(stored);

      if (isValidDataset(parsed) && parsed.seededMonth === currentMonth()) {
        return parsed;
      }
    }
  } catch {
    // Data tersimpan tidak valid; gunakan ulang data demo.
  }

  const dataset = createSeedDataset();
  saveDataset(dataset);

  return dataset;
}

export function resetDataset(): FinanceDataset {
  const dataset = createSeedDataset();
  saveDataset(dataset);

  return dataset;
}
