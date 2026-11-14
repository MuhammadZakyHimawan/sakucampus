import { TRANSACTION_TYPE_LABELS } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { TRANSACTION_VISUALS } from '@/lib/transaction-visuals';
import type { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';

export interface ReportTransactionsProps {
  transactions: Transaction[];
}

export function ReportTransactions({
  transactions,
}: ReportTransactionsProps) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Daftar transaksi pada periode laporan
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-secondary">
              <th scope="col" className="px-5 py-3 font-semibold">
                Tanggal
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Deskripsi
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Kategori
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Jenis
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Nominal
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const visual = TRANSACTION_VISUALS[transaction.type];

              return (
                <tr
                  key={transaction.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-ink-secondary">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">
                    {transaction.description}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">
                    {transaction.category}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">
                    {TRANSACTION_TYPE_LABELS[transaction.type]}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums',
                      visual.amount,
                    )}
                  >
                    {visual.prefix}
                    {formatCurrency(transaction.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-border md:hidden">
        {transactions.map((transaction) => {
          const visual = TRANSACTION_VISUALS[transaction.type];

          return (
            <li
              key={transaction.id}
              className="flex items-start justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {transaction.description}
                </p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {formatDate(transaction.date)} · {transaction.category}
                </p>
              </div>
              <p
                className={cn(
                  'shrink-0 text-sm font-semibold tabular-nums',
                  visual.amount,
                )}
              >
                {visual.prefix}
                {formatCurrency(transaction.amount)}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
