import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, RefreshCw } from 'lucide-react';
import { CashflowChart } from '@/components/charts/CashflowChart';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PeriodFilter } from '@/components/ui/PeriodFilter';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import { cn } from '@/lib/cn';
import { isMockApiEnabled } from '@/lib/config';
import { DEMO_USER } from '@/mocks/users';
import {
  buildDashboardData,
  downloadReportPdf,
  fetchDashboardSummary,
  previewReportPdf,
} from '@/services/analytics.service';
import type { DashboardData, FinancialStatus, PeriodPreset } from '@/types';
import { formatDate } from '@/utils/date';
import { getFirstName } from '@/utils/text';
import { BudgetOverview } from './components/BudgetOverview';
import { FinancialInsights } from './components/FinancialInsights';
import { RecentTransactions } from './components/RecentTransactions';
import { SummaryCards } from './components/SummaryCards';

const STATUS_CONFIG: Record<
  FinancialStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' }
> = {
  normal: { label: 'Status: Normal', variant: 'success' },
  warning: { label: 'Status: Waspada', variant: 'warning' },
  critical: { label: 'Status: Kritis', variant: 'danger' },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    transactions,
    budgets,
    financeSettings,
    syncVersion,
    isLoading,
    isRefreshing,
    refresh,
  } = useFinanceData();
  const isMock = isMockApiEnabled();

  const [period, setPeriod] = useState<PeriodPreset>(
    () => financeSettings.period,
  );
  const [serverDashboard, setServerDashboard] = useState<DashboardData | null>(
    null,
  );
  const [isPdfPreviewing, setIsPdfPreviewing] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  useEffect(() => {
    setPeriod(financeSettings.period);
  }, [financeSettings.period]);

  useEffect(() => {
    if (isMock || !user?.id) {
      setServerDashboard(null);
      return;
    }

    let cancelled = false;

    fetchDashboardSummary(period)
      .then((data) => {
        if (!cancelled) {
          setServerDashboard(data);
        }
      })
      .catch(() => {
        // Gunakan fallback kalkulasi lokal bila jaringan sementara lambat.
      });

    return () => {
      cancelled = true;
    };
  }, [isMock, user?.id, period, syncVersion]);

  const fallbackDashboard = useMemo(
    () =>
      buildDashboardData({
        user: user ?? DEMO_USER,
        transactions,
        budgets,
        preset: period,
      }),
    [period, user, transactions, budgets],
  );

  const dashboard =
    !isMock && serverDashboard && serverDashboard.period === period
      ? serverDashboard
      : fallbackDashboard;

  const activeStatus: FinancialStatus =
    dashboard.summary.financialStatus ?? 'normal';
  const statusBadge = STATUS_CONFIG[activeStatus];

  const handleSync = async () => {
    await refresh();
    toast({
      title: 'Data disinkronkan',
      description:
        'Transaksi, anggaran, dan status terbaru (termasuk dari Telegram) telah dimuat.',
      variant: 'success',
    });
  };

  const handlePreviewPdf = async () => {
    setIsPdfPreviewing(true);
    try {
      await previewReportPdf({ preset: period });
      toast({
        title: 'Membuka pratinjau PDF',
        description: 'Laporan keuangan dibuka pada tab baru.',
        variant: 'info',
      });
    } catch (pdfError) {
      toast({
        title: 'Gagal membuka PDF',
        description:
          pdfError instanceof Error
            ? pdfError.message
            : 'Silakan coba lagi beberapa saat.',
        variant: 'error',
      });
    } finally {
      setIsPdfPreviewing(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfDownloading(true);
    try {
      const filename = await downloadReportPdf({ preset: period });
      toast({
        title: 'Laporan PDF diunduh',
        description: `File ${filename} berhasil disimpan.`,
        variant: 'success',
      });
    } catch (pdfError) {
      toast({
        title: 'Gagal mengunduh PDF',
        description:
          pdfError instanceof Error
            ? pdfError.message
            : 'Silakan coba lagi beberapa saat.',
        variant: 'error',
      });
    } finally {
      setIsPdfDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Halo, ${getFirstName(user?.name ?? DEMO_USER.name)}`}
        description={`Ringkasan keuanganmu untuk ${dashboard.range.label.toLowerCase()} · ${formatDate(
          dashboard.range.start,
        )} – ${formatDate(dashboard.range.end)}.`}
        actions={
          <>
            {isMock ? (
              <Badge variant="primary">Data demo</Badge>
            ) : (
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            )}
            <PeriodFilter value={period} onChange={setPeriod} />
            {!isMock ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSync}
                  disabled={isRefreshing}
                  aria-label="Sinkronkan data terbaru"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                    aria-hidden="true"
                  />
                  Sinkronkan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewPdf}
                  isLoading={isPdfPreviewing}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Lihat PDF
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownloadPdf}
                  isLoading={isPdfDownloading}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Unduh PDF
                </Button>
              </>
            ) : null}
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
