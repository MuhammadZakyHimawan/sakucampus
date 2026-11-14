import { Flame, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import type { DashboardSummary } from '@/types';
import { formatCurrency } from '@/utils/currency';

export interface SummaryCardsProps {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const isBelowMinimum = summary.balance < summary.minBalance;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Saldo"
        value={formatCurrency(summary.balance)}
        icon={Wallet}
        tone={isBelowMinimum ? 'danger' : 'primary'}
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
        hint="Rata-rata pengeluaran harian"
      />
    </div>
  );
}
