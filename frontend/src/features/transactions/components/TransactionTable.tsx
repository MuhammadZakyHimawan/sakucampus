import { ArrowDown, ArrowUpDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TRANSACTION_TYPE_LABELS } from '@/lib/categories';
import { TRANSACTION_VISUALS } from '@/lib/transaction-visuals';
import type { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import type { TransactionSort } from '../types';
import { TransactionActions } from './TransactionActions';

export interface TransactionTableProps {
  transactions: Transaction[];
  sort: TransactionSort;
  onSortChange: (sort: TransactionSort) => void;
  onDetail: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

interface SortableHeaderProps {
  label: string;
  field: TransactionSort['field'];
  sort: TransactionSort;
  onSortChange: (sort: TransactionSort) => void;
  align?: 'left' | 'right';
}

function SortableHeader({
  label,
  field,
  sort,
  onSortChange,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = sort.field === field;
  const Icon = isActive
    ? sort.direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  const handleClick = () => {
    if (isActive) {
      onSortChange({
        field,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
      return;
    }

    onSortChange({ field, direction: 'desc' });
  };

  return (
    <th
      scope="col"
      className={cn(
        'px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-primary',
          isActive && 'text-primary',
        )}
        aria-label={`Urutkan berdasarkan ${label.toLowerCase()}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

export function TransactionTable({
  transactions,
  sort,
  onSortChange,
  onDetail,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  return (
    <div className="overflow-x-auto border-t border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-background/60">
            <th
              scope="col"
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-secondary"
            >
              Deskripsi
            </th>
            <SortableHeader
              label="Tanggal"
              field="date"
              sort={sort}
              onSortChange={onSortChange}
            />
            <th
              scope="col"
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-secondary"
            >
              Kategori
            </th>
            <th
              scope="col"
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-secondary"
            >
              Jenis
            </th>
            <SortableHeader
              label="Nominal"
              field="amount"
              sort={sort}
              onSortChange={onSortChange}
              align="right"
            />
            <th scope="col">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const visual = TRANSACTION_VISUALS[transaction.type];

            return (
              <tr
                key={transaction.id}
                className="border-b border-border transition-colors last:border-0 hover:bg-background/50"
              >
                <td className="max-w-[240px] px-5 py-3">
                  <p className="truncate font-medium text-ink">
                    {transaction.description}
                  </p>
                  {transaction.rawText ? (
                    <p className="truncate text-[11px] text-ink-secondary">
                      Chat: &ldquo;{transaction.rawText}&rdquo;
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-ink-secondary">
                  {formatDate(transaction.date)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-ink-secondary">
                  {transaction.category}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-ink-secondary',
                    )}
                  >
                    <visual.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {TRANSACTION_TYPE_LABELS[transaction.type]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <p
                    className={cn(
                      'font-bold tabular-nums',
                      visual.amount,
                    )}
                  >
                    {visual.prefix}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-ink-secondary">
                    {transaction.source === 'telegram' ? 'Telegram' : 'Manual'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <TransactionActions
                    transaction={transaction}
                    onDetail={onDetail}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    className="justify-end"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
