import { ArrowDownLeft, ArrowUpRight, Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/utils/currency';
import { previewData } from '../content';

const maxCategoryAmount = Math.max(
  ...previewData.categories.map((category) => category.amount),
);

export function MiniDashboardPreview() {
  const stats = [
    { label: 'Saldo saat ini', value: previewData.balance },
    { label: 'Pemasukan', value: previewData.income },
    { label: 'Pengeluaran', value: previewData.expense },
    { label: 'Arus kas bersih', value: previewData.netCashFlow },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">Dashboard</span>
          <Badge variant="neutral">Data contoh</Badge>
        </div>
        <span className="text-xs text-ink-secondary">Bulan ini</span>
      </div>

      <div className="flex flex-col gap-5 bg-background/70 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <p className="text-[11px] font-medium text-ink-secondary">
                {stat.label}
              </p>
              <p className="mt-1 text-sm font-bold text-ink">
                {formatCurrency(stat.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-surface p-3.5">
          <p className="text-xs font-semibold text-ink">
            Pengeluaran per kategori
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            {previewData.categories.map((category) => (
              <div key={category.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-ink-secondary">{category.label}</span>
                  <span className="font-semibold text-ink">
                    {formatCurrency(category.amount)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.round(
                        (category.amount / maxCategoryAmount) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3.5">
          <p className="text-xs font-semibold text-ink">Anggaran</p>
          <div className="mt-3 flex flex-col gap-3">
            {previewData.budgets.map((budget) => (
              <ProgressBar
                key={budget.label}
                label={budget.label}
                value={budget.used}
                max={budget.limit}
                tone={budget.tone}
                showValue
                size="sm"
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3.5">
          <p className="text-xs font-semibold text-ink">Transaksi terbaru</p>
          <div className="mt-2 divide-y divide-border">
            {previewData.transactions.map((transaction) => {
              const isIncome = transaction.type === 'income';
              const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

              return (
                <div
                  key={transaction.description}
                  className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      isIncome
                        ? 'bg-success/10 text-success'
                        : 'bg-danger/10 text-danger',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink">
                      {transaction.description}
                    </p>
                    <p className="text-[11px] text-ink-secondary">
                      {transaction.category}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'shrink-0 text-xs font-semibold',
                      isIncome ? 'text-success' : 'text-ink',
                    )}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 border-t border-border bg-surface px-4 py-3 text-[11px] leading-relaxed text-ink-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Pratinjau ilustratif. Angka pada dashboard asli mengikuti transaksi
        demo.
      </div>
    </Card>
  );
}
