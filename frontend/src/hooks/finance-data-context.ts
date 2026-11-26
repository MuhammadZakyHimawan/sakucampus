import { createContext, useContext } from 'react';
import type {
  AppNotification,
  Budget,
  BudgetInput,
  FinanceSettings,
  Goal,
  GoalInput,
  Transaction,
  TransactionInput,
} from '@/types';

export interface FinanceDataContextValue {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  financeSettings: FinanceSettings;
  syncVersion: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTransaction: (input: TransactionInput) => Promise<Transaction>;
  updateTransaction: (
    id: string,
    input: TransactionInput,
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  createBudget: (input: BudgetInput) => Promise<Budget>;
  updateBudget: (id: string, input: BudgetInput) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  createGoal: (input: GoalInput) => Promise<Goal>;
  updateGoal: (id: string, input: GoalInput) => Promise<Goal>;
  addGoalContribution: (id: string, amount: number) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<AppNotification>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  saveFinanceSettings: (
    input: Partial<FinanceSettings>,
  ) => Promise<FinanceSettings>;
}

export const FinanceDataContext = createContext<FinanceDataContextValue | null>(
  null,
);

export function useFinanceData(): FinanceDataContextValue {
  const context = useContext(FinanceDataContext);

  if (!context) {
    throw new Error(
      'useFinanceData harus digunakan di dalam FinanceDataProvider.',
    );
  }

  return context;
}
