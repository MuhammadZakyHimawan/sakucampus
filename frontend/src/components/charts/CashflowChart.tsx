import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CASHFLOW_COLORS } from '@/lib/chart-colors';
import { NO_TRANSACTIONS_MESSAGE } from '@/lib/constants';
import type { CashflowPoint } from '@/types';
import { formatCompactCurrency, formatCurrency } from '@/utils/currency';

export interface CashflowChartProps {
  data: CashflowPoint[];
  title?: string;
  description?: string;
  className?: string;
}

export function CashflowChart({
  data,
  title = 'Pemasukan vs Pengeluaran',
  description = 'Perbandingan arus kas pada periode terpilih.',
  className,
}: CashflowChartProps) {
  const hasData = data.some(
    (point) => point.income > 0 || point.expense > 0,
  );

  return (
    <ChartCard title={title} description={description} className={className}>
      {hasData ? (
        <>
          <div className="flex items-center gap-4 text-xs text-ink-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              Pemasukan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" />
              Pengeluaran
            </span>
          </div>
          <div className="mt-4 h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barGap={2}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgb(var(--color-border))"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tick={{
                    fill: 'rgb(var(--color-text-secondary))',
                    fontSize: 12,
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(value: number) => formatCompactCurrency(value)}
                  tick={{
                    fill: 'rgb(var(--color-text-secondary))',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgb(var(--color-background))' }}
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgb(var(--color-border))',
                    background: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text-primary))',
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="income"
                  name="Pemasukan"
                  fill={CASHFLOW_COLORS.income}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="expense"
                  name="Pengeluaran"
                  fill={CASHFLOW_COLORS.expense}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Belum ada transaksi"
          description={NO_TRANSACTIONS_MESSAGE}
        />
      )}
    </ChartCard>
  );
}
