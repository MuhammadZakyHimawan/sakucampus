import { PieChart as PieChartIcon } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCategoryColor } from '@/lib/chart-colors';
import { NO_EXPENSE_MESSAGE } from '@/lib/constants';
import type { CategoryTotal } from '@/types';
import { formatCompactCurrency, formatCurrency } from '@/utils/currency';

export interface CategoryChartProps {
  categories: CategoryTotal[];
  title?: string;
  description?: string;
  className?: string;
}

export function CategoryChart({
  categories,
  title = 'Pengeluaran per Kategori',
  description = 'Distribusi pengeluaran pada periode terpilih.',
  className,
}: CategoryChartProps) {
  const total = categories.reduce((sum, item) => sum + item.total, 0);

  return (
    <ChartCard title={title} description={description} className={className}>
      {categories.length > 0 ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-56 w-full shrink-0 sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="total"
                  nameKey="category"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="rgb(var(--color-surface))"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {categories.map((item) => (
                    <Cell
                      key={item.category}
                      fill={getCategoryColor(item.category)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgb(var(--color-border))',
                    background: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text-primary))',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-ink-secondary">Total</p>
              <p className="text-lg font-bold text-ink">
                {formatCompactCurrency(total)}
              </p>
            </div>
          </div>

          <ul className="flex flex-1 flex-col gap-2.5">
            {categories.map((item) => {
              const percentage =
                total > 0 ? Math.round((item.total / total) * 100) : 0;

              return (
                <li
                  key={item.category}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(item.category),
                      }}
                    />
                    <span className="truncate text-ink-secondary">
                      {item.category}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold text-ink">
                      {formatCompactCurrency(item.total)}
                    </span>
                    <span className="ml-2 text-ink-secondary">
                      {percentage}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={PieChartIcon}
          title="Belum ada pengeluaran"
          description={NO_EXPENSE_MESSAGE}
        />
      )}
    </ChartCard>
  );
}
