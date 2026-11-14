import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { TransactionType } from '@/types';

export interface TransactionVisual {
  icon: LucideIcon;
  iconContainer: string;
  amount: string;
  prefix: string;
  badge: BadgeVariant;
}

export const TRANSACTION_VISUALS: Record<TransactionType, TransactionVisual> =
  {
    income: {
      icon: ArrowDownLeft,
      iconContainer: 'bg-success/10 text-success',
      amount: 'text-success',
      prefix: '+',
      badge: 'success',
    },
    expense: {
      icon: ArrowUpRight,
      iconContainer: 'bg-danger/10 text-danger',
      amount: 'text-danger',
      prefix: '-',
      badge: 'danger',
    },
    transfer: {
      icon: ArrowLeftRight,
      iconContainer: 'bg-info/10 text-info',
      amount: 'text-info',
      prefix: '',
      badge: 'info',
    },
  };
