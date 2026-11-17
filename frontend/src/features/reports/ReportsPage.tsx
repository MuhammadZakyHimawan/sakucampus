import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Download,
  FileBarChart,
  Minus,
  Wallet,
} from 'lucide-react';
import { CashflowChart } from '@/components/charts/CashflowChart';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PeriodFilter } from '@/components/ui/PeriodFilter';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/toast-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import { TRANSACTION_TYPE_LABELS } from '@/lib/categories';
import { MOCK_API_ENABLED } from '@/lib/config';
import { DEFAULT_DASHBOARD_PERIOD, NO_REPORTS_MESSAGE } from '@/lib/constants';
import { buildReportData } from '@/services/analytics.service';
import type { PeriodPreset } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { downloadCsv } from '@/utils/csv';
import { formatDate } from '@/utils/date';
import { ReportTransactions } from './components/ReportTransactions';

type ComparisonKey = 'income' | 'expense' | 'net';

interface ComparisonItemProps {
  label: string;
  current: number;
  previous: number;
  change: number | null;
  betterWhenHigher: boolean;
}

function ComparisonItem({
  label,
  current,
  previous,
  change,
  betterWhenHigher,
}: ComparisonItemProps) {
  const isPositive =
    change === null ? false : betterWhenHigher ? change > 0 : change < 0;
  const isNeutral = change === null || change === 0;
  const changeLabel =
    change === null
      ? current === 0 && previous === 0
        ? '—'
        : 'Baru'
      : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  const variant = isNeutral ? 'neutral' : isPositive ? 'success' : 'danger';

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-ink-secondary">{label}</p>
      <p className="break-words text-xl font-bold tracking-tight text-ink">
        {formatCurrency(current)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant}>
          {change !== null && change !== 0 ? (
            change > 0 ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
            )
          ) : (
            <Minus className="h-3 w-3" aria-hidden="true" />
          )}
          {changeLabel}
        </Badge>
        <span className="break-words text-xs text-ink-secondary">
          Sebelumnya {formatCurrency(previous)}
        </span>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { transactions, isLoading, error } = useFinanceData();
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodPreset>(DEFAULT_DASHBOARD_PERIOD);
  const report = useMemo(
    () => buildReportData({ transactions, preset: period }),
    [transactions, period],
  );

  const hasTransactions = report.transactions.length > 0;

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ['Tanggal', 'Deskripsi', 'Jenis', 'Kategori', 'Sumber', 'Nominal'],
      ...report.transactions.map((transaction) => [
        formatDate(transaction.date),
        transaction.description,
        TRANSACTION_TYPE_LABELS[transaction.type],
        transaction.category,
        transaction.source === 'telegram' ? 'Telegram' : 'Website',
        transaction.amount,
      ]),
    ];

    downloadCsv(
      `sakucampus-laporan-${report.range.start}-${report.range.end}.csv`,
      rows,
    );
    toast({
      title: 'Laporan diunduh',
      description: `${report.transactions.length} transaksi diekspor ke CSV.`,
      variant: 'success',
    });
  };

  const comparisonItems: {
    key: ComparisonKey;
    label: string;
    current: number;
    previous: number;
    change: number | null;
    betterWhenHigher: boolean;
  }[] = [
    {
      key: 'income',
      label: 'Pemasukan',
      current: report.summary.income,
      previous: report.comparison.previous.income,
      change: report.comparison.incomeChange,
      betterWhenHigher: true,
    },
    {
      key: 'expense',
      label: 'Pengeluaran',
      current: report.summary.expense,
      previous: report.comparison.previous.expense,
      change: report.comparison.expenseChange,
      betterWhenHigher: false,
    },
    {
      key: 'net',
      label: 'Net cash flow',
      current: report.summary.net,
      previous: report.comparison.previous.net,
      change: report.comparison.netChange,
      betterWhenHigher: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan"
        description="Analisis pemasukan, pengeluaran, dan arus kas pada periode terpilih."
        actions={
          <>
            <Badge variant={MOCK_API_ENABLED ? 'primary' : 'success'}>
              {MOCK_API_ENABLED ? 'Data demo' : 'Tersinkron'}
            </Badge>
            <PeriodFilter
              value={period}
              onChange={setPeriod}
              ariaLabel="Pilih periode laporan"
            />
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!hasTransactions}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Unduh CSV
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Card>
          <LoadingState message="Memuat laporan..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} />
        </Card>
      ) : !hasTransactions ? (
        <Card>
          <EmptyState
            icon={FileBarChart}
            title="Belum ada data laporan"
            description={NO_REPORTS_MESSAGE}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Pemasukan"
              value={formatCurrency(report.summary.income)}
              icon={ArrowUpRight}
              tone="success"
              hint={report.range.label}
            />
            <StatCard
              label="Total Pengeluaran"
              value={formatCurrency(report.summary.expense)}
              icon={ArrowDownLeft}
              tone="danger"
              hint={report.range.label}
            />
            <StatCard
              label="Net Cash Flow"
              value={formatCurrency(report.summary.net)}
              icon={Wallet}
              tone={report.summary.net >= 0 ? 'success' : 'danger'}
              hint="Pemasukan dikurangi pengeluaran"
            />
            <StatCard
              label="Rata-rata Pengeluaran"
              value={formatCurrency(report.summary.dailyAverageExpense)}
              icon={CalendarClock}
              tone="warning"
              hint="Per hari pada periode ini"
            />
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Perbandingan Periode</CardTitle>
                <CardDescription>
                  {report.range.label} dibandingkan periode sebelumnya (
                  {formatDate(report.previousRange.start)} –{' '}
                  {formatDate(report.previousRange.end)}).
                </CardDescription>
              </div>
              <Badge variant="neutral">
                {report.summary.transactionCount} transaksi
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {comparisonItems.map((item) => (
                <ComparisonItem
                  key={item.key}
                  label={item.label}
                  current={item.current}
                  previous={item.previous}
                  change={item.change}
                  betterWhenHigher={item.betterWhenHigher}
                />
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <CashflowChart
              data={report.cashflow}
              title="Tren Arus Kas"
              description={`Pemasukan dan pengeluaran untuk ${report.range.label.toLowerCase()}.`}
              className="xl:col-span-2"
            />
            <CategoryChart
              categories={report.categories}
              title="Distribusi Kategori"
              description="Kategori dengan pengeluaran terbesar pada periode ini."
            />
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div>
                <CardTitle>Rincian Transaksi</CardTitle>
                <CardDescription>
                  {formatDate(report.range.start)} –{' '}
                  {formatDate(report.range.end)} ·{' '}
                  {report.summary.transactionCount} transaksi
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ReportTransactions transactions={report.transactions} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
