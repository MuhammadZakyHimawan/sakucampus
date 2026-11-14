import { Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Transaction } from '@/types';

export interface TransactionActionsProps {
  transaction: Transaction;
  onDetail: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  className?: string;
}

export function TransactionActions({
  transaction,
  onDetail,
  onEdit,
  onDelete,
  className,
}: TransactionActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onDetail(transaction)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-primary-light hover:text-primary-dark"
        aria-label={`Lihat detail ${transaction.description}`}
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onEdit(transaction)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-primary-light hover:text-primary-dark"
        aria-label={`Edit ${transaction.description}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(transaction)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-danger/10 hover:text-danger"
        aria-label={`Hapus ${transaction.description}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
