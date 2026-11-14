import { cn } from '@/lib/cn';
import { PERIOD_OPTIONS } from '@/lib/constants';
import type { PeriodPreset } from '@/types';

export interface PeriodFilterProps {
  value: PeriodPreset;
  onChange: (value: PeriodPreset) => void;
  className?: string;
  ariaLabel?: string;
}

export function PeriodFilter({
  value,
  onChange,
  className,
  ariaLabel = 'Pilih periode dashboard',
}: PeriodFilterProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-border bg-surface p-1',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {PERIOD_OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-ink-secondary hover:bg-background hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
