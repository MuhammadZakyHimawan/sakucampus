import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { DEFAULT_CURRENCY, isMockApiEnabled } from '@/lib/config';
import { DEFAULT_DASHBOARD_PERIOD } from '@/lib/constants';
import {
  createBudget,
  deleteBudget,
  getBudgets,
  updateBudget,
} from '@/services/budget.service';
import {
  addGoalContribution as addGoalContributionRequest,
  createGoal as createGoalRequest,
  deleteGoal as deleteGoalRequest,
  getGoals,
  updateGoal as updateGoalRequest,
} from '@/services/goals.service';
import {
  deleteNotification as deleteNotificationRequest,
  getNotifications,
  markAllNotificationsRead as markAllNotificationsReadRequest,
  markNotificationRead as markNotificationReadRequest,
} from '@/services/notifications.service';
import {
  fetchFinanceSettings,
  getFinancePreferences,
  updateFinanceSettings,
} from '@/services/settings.service';
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from '@/services/transaction.service';
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
import { FinanceDataContext } from './finance-data-context';

function createInitialSettings(): FinanceSettings {
  const prefs = getFinancePreferences();
  return {
    initialBalance: 0,
    minBalance: 0,
    currency: DEFAULT_CURRENCY,
    period: prefs.period ?? DEFAULT_DASHBOARD_PERIOD,
    notifyBudget: prefs.notifyBudget,
    notifyBalance: prefs.notifyBalance,
    notifyGoal: prefs.notifyGoal,
  };
}

function sortGoalsByDeadline(items: Goal[]): Goal[] {
  return [...items].sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [financeSettings, setFinanceSettings] = useState<FinanceSettings>(() =>
    createInitialSettings(),
  );
  const [syncVersion, setSyncVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSyncRef = useRef<number>(0);

  const syncNotificationsSilently = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const freshNotifs = await getNotifications();
      setNotifications(freshNotifs);
    } catch {
      // Abaikan kegagalan sinkronisasi notifikasi latar belakang.
    }
  }, [isAuthenticated]);

  const loadAllDomainData = useCallback(
    async (silent = false) => {
      if (!isAuthenticated || !user?.id) {
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [
          loadedTransactions,
          loadedBudgets,
          loadedGoals,
          loadedNotifications,
          loadedSettings,
        ] = await Promise.all([
          getTransactions(),
          getBudgets(),
          getGoals(),
          getNotifications(),
          fetchFinanceSettings(),
        ]);

        setTransactions(loadedTransactions);
        setBudgets(loadedBudgets);
        setGoals(sortGoalsByDeadline(loadedGoals));
        setNotifications(loadedNotifications);
        setFinanceSettings(loadedSettings);
        setSyncVersion((v) => v + 1);
        setError(null);
        lastSyncRef.current = Date.now();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Data keuangan gagal dimuat.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated, user?.id],
  );

  // Reset state immediately on logout or user switch, and fetch ONLY when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setNotifications([]);
      setFinanceSettings(createInitialSettings());
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      getTransactions(),
      getBudgets(),
      getGoals(),
      getNotifications(),
      fetchFinanceSettings(),
    ])
      .then(
        ([
          loadedTransactions,
          loadedBudgets,
          loadedGoals,
          loadedNotifications,
          loadedSettings,
        ]) => {
          if (cancelled) {
            return;
          }
          setTransactions(loadedTransactions);
          setBudgets(loadedBudgets);
          setGoals(sortGoalsByDeadline(loadedGoals));
          setNotifications(loadedNotifications);
          setFinanceSettings(loadedSettings);
          setSyncVersion((v) => v + 1);
          setError(null);
          lastSyncRef.current = Date.now();
        },
      )
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Data keuangan gagal dimuat.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // Auto-sync gently when browser tab regains focus in live mode (e.g. returning from Telegram)
  useEffect(() => {
    if (!isAuthenticated || isMockApiEnabled()) {
      return;
    }

    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastSyncRef.current >= 5_000
      ) {
        void loadAllDomainData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, loadAllDomainData]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    await Promise.all([loadAllDomainData(true), refreshUser()]);
  }, [isAuthenticated, loadAllDomainData, refreshUser]);

  const handleCreateTransaction = useCallback(
    async (input: TransactionInput) => {
      const created = await createTransaction(input);
      setTransactions((previous) => [created, ...previous]);
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
      return created;
    },
    [syncNotificationsSilently],
  );

  const handleUpdateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const updated = await updateTransaction(id, input);
      setTransactions((previous) =>
        previous.map((transaction) =>
          transaction.id === updated.id ? updated : transaction,
        ),
      );
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
      return updated;
    },
    [syncNotificationsSilently],
  );

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
      setTransactions((previous) =>
        previous.filter((transaction) => transaction.id !== id),
      );
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
    },
    [syncNotificationsSilently],
  );

  const handleCreateBudget = useCallback(
    async (input: BudgetInput) => {
      const created = await createBudget(input);
      setBudgets((previous) => [...previous, created]);
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
      return created;
    },
    [syncNotificationsSilently],
  );

  const handleUpdateBudget = useCallback(
    async (id: string, input: BudgetInput) => {
      const updated = await updateBudget(id, input);
      setBudgets((previous) =>
        previous.map((budget) => (budget.id === updated.id ? updated : budget)),
      );
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
      return updated;
    },
    [syncNotificationsSilently],
  );

  const handleDeleteBudget = useCallback(async (id: string) => {
    await deleteBudget(id);
    setBudgets((previous) => previous.filter((budget) => budget.id !== id));
    setSyncVersion((v) => v + 1);
  }, []);

  const handleCreateGoal = useCallback(
    async (input: GoalInput) => {
      const created = await createGoalRequest(input);
      setGoals((previous) => sortGoalsByDeadline([...previous, created]));
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
      return created;
    },
    [syncNotificationsSilently],
  );

  const handleUpdateGoal = useCallback(
    async (id: string, input: GoalInput) => {
      const updated = await updateGoalRequest(id, input);
      setGoals((previous) =>
        sortGoalsByDeadline(
          previous.map((goal) => (goal.id === updated.id ? updated : goal)),
        ),
      );
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
      return updated;
    },
    [syncNotificationsSilently],
  );

  const handleAddGoalContribution = useCallback(
    async (id: string, amount: number) => {
      const updated = await addGoalContributionRequest(id, amount);
      setGoals((previous) =>
        sortGoalsByDeadline(
          previous.map((goal) => (goal.id === updated.id ? updated : goal)),
        ),
      );
      setSyncVersion((v) => v + 1);
      void syncNotificationsSilently();
      return updated;
    },
    [syncNotificationsSilently],
  );

  const handleDeleteGoal = useCallback(async (id: string) => {
    await deleteGoalRequest(id);
    setGoals((previous) => previous.filter((goal) => goal.id !== id));
    setSyncVersion((v) => v + 1);
  }, []);

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    const updated = await markNotificationReadRequest(id);
    setNotifications((previous) =>
      previous.map((item) => (item.id === updated.id ? updated : item)),
    );
    return updated;
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    await markAllNotificationsReadRequest();
    setNotifications((previous) =>
      previous.map((item) => ({ ...item, read: true })),
    );
  }, []);

  const handleDeleteNotification = useCallback(async (id: string) => {
    await deleteNotificationRequest(id);
    setNotifications((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const handleSaveFinanceSettings = useCallback(
    async (input: Partial<FinanceSettings>) => {
      const updated = await updateFinanceSettings(input);
      setFinanceSettings(updated);
      setSyncVersion((v) => v + 1);
      void refreshUser();
      void syncNotificationsSilently();
      return updated;
    },
    [refreshUser, syncNotificationsSilently],
  );

  const unreadNotificationCount = useMemo(
    () =>
      notifications.filter((n) => {
        if (n.read) {
          return false;
        }
        if (n.type === 'budget' && !financeSettings.notifyBudget) {
          return false;
        }
        if (n.type === 'balance' && !financeSettings.notifyBalance) {
          return false;
        }
        if (n.type === 'goal' && !financeSettings.notifyGoal) {
          return false;
        }
        return true;
      }).length,
    [notifications, financeSettings],
  );

  const value = useMemo(
    () => ({
      transactions,
      budgets,
      goals,
      notifications,
      unreadNotificationCount,
      financeSettings,
      syncVersion,
      isLoading,
      isRefreshing,
      error,
      refresh,
      createTransaction: handleCreateTransaction,
      updateTransaction: handleUpdateTransaction,
      deleteTransaction: handleDeleteTransaction,
      createBudget: handleCreateBudget,
      updateBudget: handleUpdateBudget,
      deleteBudget: handleDeleteBudget,
      createGoal: handleCreateGoal,
      updateGoal: handleUpdateGoal,
      addGoalContribution: handleAddGoalContribution,
      deleteGoal: handleDeleteGoal,
      markNotificationRead: handleMarkNotificationRead,
      markAllNotificationsRead: handleMarkAllNotificationsRead,
      deleteNotification: handleDeleteNotification,
      saveFinanceSettings: handleSaveFinanceSettings,
    }),
    [
      transactions,
      budgets,
      goals,
      notifications,
      unreadNotificationCount,
      financeSettings,
      syncVersion,
      isLoading,
      isRefreshing,
      error,
      refresh,
      handleCreateTransaction,
      handleUpdateTransaction,
      handleDeleteTransaction,
      handleCreateBudget,
      handleUpdateBudget,
      handleDeleteBudget,
      handleCreateGoal,
      handleUpdateGoal,
      handleAddGoalContribution,
      handleDeleteGoal,
      handleMarkNotificationRead,
      handleMarkAllNotificationsRead,
      handleDeleteNotification,
      handleSaveFinanceSettings,
    ],
  );

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
}
