import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createBudget,
  deleteBudget,
  getBudgets,
  updateBudget,
} from '@/services/budget.service';
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from '@/services/transaction.service';
import type {
  Budget,
  BudgetInput,
  Transaction,
  TransactionInput,
} from '@/types';
import { FinanceDataContext } from './finance-data-context';

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFinanceData() {
      setIsLoading(true);

      try {
        const [loadedTransactions, loadedBudgets] = await Promise.all([
          getTransactions(),
          getBudgets(),
        ]);

        if (cancelled) {
          return;
        }

        setTransactions(loadedTransactions);
        setBudgets(loadedBudgets);
        setError(null);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Data keuangan gagal dimuat.',
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFinanceData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateTransaction = useCallback(
    async (input: TransactionInput) => {
      const created = await createTransaction(input);
      setTransactions((previous) => [created, ...previous]);

      return created;
    },
    [],
  );

  const handleUpdateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const updated = await updateTransaction(id, input);
      setTransactions((previous) =>
        previous.map((transaction) =>
          transaction.id === updated.id ? updated : transaction,
        ),
      );

      return updated;
    },
    [],
  );

  const handleDeleteTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id);
    setTransactions((previous) =>
      previous.filter((transaction) => transaction.id !== id),
    );
  }, []);

  const handleCreateBudget = useCallback(async (input: BudgetInput) => {
    const created = await createBudget(input);
    setBudgets((previous) => [...previous, created]);

    return created;
  }, []);

  const handleUpdateBudget = useCallback(
    async (id: string, input: BudgetInput) => {
      const updated = await updateBudget(id, input);
      setBudgets((previous) =>
        previous.map((budget) => (budget.id === updated.id ? updated : budget)),
      );

      return updated;
    },
    [],
  );

  const handleDeleteBudget = useCallback(async (id: string) => {
    await deleteBudget(id);
    setBudgets((previous) => previous.filter((budget) => budget.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      transactions,
      budgets,
      isLoading,
      error,
      createTransaction: handleCreateTransaction,
      updateTransaction: handleUpdateTransaction,
      deleteTransaction: handleDeleteTransaction,
      createBudget: handleCreateBudget,
      updateBudget: handleUpdateBudget,
      deleteBudget: handleDeleteBudget,
    }),
    [
      transactions,
      budgets,
      isLoading,
      error,
      handleCreateTransaction,
      handleUpdateTransaction,
      handleDeleteTransaction,
      handleCreateBudget,
      handleUpdateBudget,
      handleDeleteBudget,
    ],
  );

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
}
