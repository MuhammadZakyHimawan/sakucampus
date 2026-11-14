import {
  ReceiptText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { TRANSACTION_TYPE_LABELS } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { NO_TRANSACTIONS_MESSAGE } from '@/lib/constants';
import { TRANSACTION_VISUALS } from '@/lib/transaction-visuals';
import type { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';

export interface RecentTransactionsProps {
  transactions: Transaction[];
  className?: string;
}

export function RecentTransactions({
  transactions,
  className,
}: RecentTransactionsProps) {
  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Transaksi Terbaru</CardTitle>
          <CardDescription>
            Aktivitas terakhir pada periode terpilih.
          </CardDescription>
        </div>
        <Link
          to="/transactions"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Lihat semua
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {transactions.length > 0 ? (
        <ul className="flex flex-col">
          {transactions.map((transaction) => {
            const config = TRANSACTION_VISUALS[transaction.type];
            const Icon = config.icon;

            return (
              <li
                key={transaction.id}
                className="flex items-center gap-3 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    config.iconContainer,
                  )}
                >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {transaction.description}
                    </p>
                    <p className="truncate text-xs text-ink-secondary">
                      {formatDate(transaction.date)} · {transaction.category} ·{' '}
                      {TRANSACTION_TYPE_LABELS[transaction.type]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        config.amount,
                      )}
                    >
                      {config.prefix}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Badge
                      variant="neutral"
                      className="mt-1 px-2 py-0.5 text-[10px] font-medium"
                    >
                      {transaction.source === 'telegram' ? 'Telegram' : 'Manual'}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Belum ada transaksi"
            description={NO_TRANSACTIONS_MESSAGE}
            action={
              <Link
                to="/transactions"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Catat transaksi
              </Link>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
