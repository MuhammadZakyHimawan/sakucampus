import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
  className?: string;
}

export function LoadingState({
  message = 'Memuat data...',
  fullPage = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-10 text-center',
        fullPage && 'min-h-screen',
        className,
      )}
      role="status"
    >
      <Loader2
        className="h-6 w-6 animate-spin text-primary"
        aria-hidden="true"
      />
      <p className="text-sm text-ink-secondary">{message}</p>
    </div>
  );
}
