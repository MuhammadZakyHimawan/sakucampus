import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

type CtaVariant = 'primary' | 'outline' | 'light' | 'outlineLight';
type CtaSize = 'md' | 'lg';

export interface CtaLinkProps {
  to: string;
  variant?: CtaVariant;
  size?: CtaSize;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<CtaVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary',
  outline:
    'border border-border bg-surface text-ink hover:border-primary hover:text-primary',
  light:
    'bg-white text-primary-dark hover:bg-primary-light focus-visible:ring-white',
  outlineLight:
    'border border-white/50 bg-transparent text-white hover:bg-white/10 focus-visible:ring-white',
};

const sizeClasses: Record<CtaSize, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function CtaLink({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: CtaLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
