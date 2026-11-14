import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { ProgressTone } from '@/components/ui/ProgressBar';
import { BUDGET_STATUS_LABELS } from '@/lib/categories';
import { cn } from '@/lib/cn';
import type { BudgetOverviewItem, BudgetStatus } from '@/types';
import { formatCurrency } from '@/utils/currency';

export interface BudgetProgressProps {
  item: BudgetOverviewItem;
  className?: string;
}

const statusConfig: Record<
  BudgetStatus,
  { badge: BadgeVariant; progress: ProgressTone }
> = {
  safe: { badge: 'success', progress: 'success' },
  warning: { badge: 'warning', progress: 'warning' },
  exceeded: { badge: 'danger', progress: 'danger' },
};

export function BudgetProgress({ item, className }: BudgetProgressProps) {
  const config = statusConfig[item.status];
  const isOverBudget = item.remaining < 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-ink">
          {item.budget.category}
        </p>
        <Badge variant={config.badge}>{BUDGET_STATUS_LABELS[item.status]}</Badge>
      </div>
      <ProgressBar
        value={item.used}
        max={item.budget.limit}
        tone={config.progress}
        size="sm"
        label={`${formatCurrency(item.used)} dari ${formatCurrency(
          item.budget.limit,
        )}`}
        showValue
      />
      <p
        className={cn(
          'text-xs',
          isOverBudget ? 'font-medium text-danger' : 'text-ink-secondary',
        )}
      >
        {isOverBudget
          ? `Lewat ${formatCurrency(Math.abs(item.remaining))} dari anggaran`
          : `Sisa ${formatCurrency(item.remaining)}`}
      </p>
    </div>
  );
}
