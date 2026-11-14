import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TRANSACTION_TYPE_LABELS } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { TRANSACTION_VISUALS } from '@/lib/transaction-visuals';
import type { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { TransactionActions } from './TransactionActions';

export interface TransactionListProps {
  transactions: Transaction[];
  onDetail: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  onDetail,
  onEdit,
  onDelete,
}: TransactionListProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {transactions.map((transaction) => {
        const visual = TRANSACTION_VISUALS[transaction.type];
        const Icon = visual.icon;

        return (
          <li key={transaction.id}>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    visual.iconContainer,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {transaction.description}
                    </p>
                    <p
                      className={cn(
                        'shrink-0 text-sm font-bold tabular-nums',
                        visual.amount,
                      )}
                    >
                      {visual.prefix}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-secondary">
                    {formatDate(transaction.date)} · {transaction.category} ·{' '}
                    {TRANSACTION_TYPE_LABELS[transaction.type]}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Badge
                      variant="neutral"
                      className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    >
                      {transaction.source === 'telegram' ? 'Telegram' : 'Manual'}
                    </Badge>
                    <TransactionActions
                      transaction={transaction}
                      onDetail={onDetail}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
