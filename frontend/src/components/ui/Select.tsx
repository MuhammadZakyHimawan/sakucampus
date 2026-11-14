import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, label, error, hint, id, children, ...props }, ref) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const messageId = error
      ? `${selectId}-error`
      : hint
        ? `${selectId}-hint`
        : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={cn(
            'h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-background',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p
            id={`${selectId}-error`}
            className="text-xs font-medium text-danger"
          >
            {error}
          </p>
        ) : hint ? (
          <p id={`${selectId}-hint`} className="text-xs text-ink-secondary">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
