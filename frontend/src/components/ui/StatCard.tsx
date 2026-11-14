import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from './Card';

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: StatTone;
  className?: string;
}

const toneClasses: Record<StatTone, string> = {
  primary: 'bg-primary-light text-primary-dark',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'primary',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium text-ink-secondary">{label}</p>
          <p className="break-words text-xl font-bold tracking-tight text-ink sm:text-2xl xl:text-xl 2xl:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="break-words text-xs text-ink-secondary">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              toneClasses[tone],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
