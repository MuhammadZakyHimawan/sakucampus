import { createContext, useContext } from 'react';
import type { Budget, BudgetInput, Transaction, TransactionInput } from '@/types';

export interface FinanceDataContextValue {
  transactions: Transaction[];
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  createTransaction: (input: TransactionInput) => Promise<Transaction>;
  updateTransaction: (
    id: string,
    input: TransactionInput,
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  createBudget: (input: BudgetInput) => Promise<Budget>;
  updateBudget: (id: string, input: BudgetInput) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
}

export const FinanceDataContext = createContext<FinanceDataContextValue | null>(
  null,
);

export function useFinanceData(): FinanceDataContextValue {
  const context = useContext(FinanceDataContext);

  if (!context) {
    throw new Error('useFinanceData harus digunakan di dalam FinanceDataProvider.');
  }

  return context;
}
