import { useMemo, useState } from 'react';
import { CashflowChart } from '@/components/charts/CashflowChart';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PeriodFilter } from '@/components/ui/PeriodFilter';
import { useAuth } from '@/features/auth/auth-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import { DEMO_USER } from '@/mocks/users';
import { buildDashboardData } from '@/services/analytics.service';
import { getFinancePreferences } from '@/services/settings.service';
import type { PeriodPreset } from '@/types';
import { formatDate } from '@/utils/date';
import { getFirstName } from '@/utils/text';
import { BudgetOverview } from './components/BudgetOverview';
import { FinancialInsights } from './components/FinancialInsights';
import { RecentTransactions } from './components/RecentTransactions';
import { SummaryCards } from './components/SummaryCards';

export function DashboardPage() {
  const { user } = useAuth();
  const { transactions, budgets, isLoading } = useFinanceData();
  const [period, setPeriod] = useState<PeriodPreset>(
    () => getFinancePreferences().period,
  );
  const dashboard = useMemo(
    () =>
      buildDashboardData({
        user: user ?? DEMO_USER,
        transactions,
        budgets,
        preset: period,
      }),
    [period, user, transactions, budgets],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Halo, ${getFirstName(user?.name ?? DEMO_USER.name)}`}
        description={`Ringkasan keuanganmu untuk ${dashboard.range.label.toLowerCase()} · ${formatDate(
          dashboard.range.start,
        )} – ${formatDate(dashboard.range.end)}.`}
        actions={
          <>
            <Badge variant="primary">Data demo</Badge>
            <PeriodFilter value={period} onChange={setPeriod} />
          </>
        }
      />

      {isLoading ? (
        <Card>
          <LoadingState message="Memuat ringkasan keuangan..." />
        </Card>
      ) : (
        <>
          <SummaryCards summary={dashboard.summary} />

          <div className="grid gap-4 xl:grid-cols-3">
            <CashflowChart
              data={dashboard.cashflow}
              className="xl:col-span-2"
            />
            <CategoryChart categories={dashboard.categories} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <BudgetOverview
              items={dashboard.budgets}
              className="xl:col-span-2"
            />
            <FinancialInsights insights={dashboard.insights} />
          </div>

          <RecentTransactions transactions={dashboard.recentTransactions} />
        </>
      )}
    </div>
  );
}
