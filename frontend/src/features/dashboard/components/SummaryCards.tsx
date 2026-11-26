import {
  Flame,
  Hourglass,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import type { DashboardSummary } from '@/types';
import { formatCurrency } from '@/utils/currency';

export interface SummaryCardsProps {
  summary: DashboardSummary;
}

function resolveRunwayDisplay(summary: DashboardSummary): {
  value: string;
  hint: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
} {
  const computedRunway =
    summary.runwayDays !== undefined
      ? summary.runwayDays
      : summary.burnRate > 0
        ? Math.max(0, Math.round((summary.balance / summary.burnRate) * 10) / 10)
        : null;

  if (computedRunway === null) {
    return {
      value: 'Aman',
      hint: 'Belum ada laju pengeluaran pada periode ini',
      tone: 'success',
    };
  }

  if (computedRunway <= 0) {
    return {
      value: '0 hari',
      hint: 'Saldo habis atau defisit',
      tone: 'danger',
    };
  }

  if (computedRunway <= 3) {
    return {
      value: `${computedRunway} hari`,
      hint: 'Ketahanan saldo kritis — rem pengeluaran',
      tone: 'danger',
    };
  }

  if (computedRunway <= 14) {
    return {
      value: `${computedRunway} hari`,
      hint: 'Estimasi ketahanan saldo perlu diwaspadai',
      tone: 'warning',
    };
  }

  return {
    value: `${computedRunway} hari`,
    hint: 'Estimasi hari saldo bertahan',
    tone: 'info',
  };
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const isBelowMinimum =
    summary.minBalance > 0 && summary.balance < summary.minBalance;
  const runway = resolveRunwayDisplay(summary);
  const burnRateHint =
    summary.safeDailySpend !== undefined
      ? `Batas aman ${formatCurrency(summary.safeDailySpend)}/hari`
      : 'Rata-rata pengeluaran harian';

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Total Saldo"
        value={formatCurrency(summary.balance)}
        icon={Wallet}
        tone={isBelowMinimum || summary.balance <= 0 ? 'danger' : 'primary'}
        hint={
          isBelowMinimum
            ? `Di bawah batas minimum ${formatCurrency(summary.minBalance)}`
            : `Batas minimum ${formatCurrency(summary.minBalance)}`
        }
      />
      <StatCard
        label="Pemasukan"
        value={formatCurrency(summary.income)}
        icon={TrendingUp}
        tone="success"
        hint="Total pemasukan periode ini"
      />
      <StatCard
        label="Pengeluaran"
        value={formatCurrency(summary.expense)}
        icon={TrendingDown}
        tone="danger"
        hint={`Arus kas bersih ${formatCurrency(summary.net)}`}
      />
      <StatCard
        label="Burn Rate"
        value={`${formatCurrency(summary.burnRate)}/hari`}
        icon={Flame}
        tone="warning"
        hint={burnRateHint}
      />
      <StatCard
        label="Runway Saldo"
        value={runway.value}
        icon={Hourglass}
        tone={runway.tone}
        hint={runway.hint}
      />
    </div>
  );
}
