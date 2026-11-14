import { cn } from '@/lib/cn';

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger';

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  label?: string;
  showValue?: boolean;
  className?: string;
}

const toneClasses: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export function ProgressBar({
  value,
  max = 100,
  tone = 'primary',
  size = 'md',
  label,
  showValue = false,
  className,
}: ProgressBarProps) {
  const percentage =
    max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label || showValue ? (
        <div className="flex items-center justify-between text-xs text-ink-secondary">
          {label ? <span>{label}</span> : <span />}
          {showValue ? (
            <span className="font-semibold text-ink">
              {Math.round(percentage)}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-border',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progres'}
      >
        <div
          className={cn('h-full rounded-full transition-all', toneClasses[tone])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
