import { forwardRef, useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, label, error, hint, id, ...props }, ref) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const messageId = error
      ? `${textareaId}-error`
      : hint
        ? `${textareaId}-hint`
        : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={textareaId} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-secondary/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-background',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...props}
        />
        {error ? (
          <p
            id={`${textareaId}-error`}
            className="text-xs font-medium text-danger"
          >
            {error}
          </p>
        ) : hint ? (
          <p id={`${textareaId}-hint`} className="text-xs text-ink-secondary">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
