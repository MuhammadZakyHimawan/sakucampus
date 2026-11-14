import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/categories';
import type { TransactionType } from '@/types';
import type { TransactionFilterValues, TransactionSort } from '../types';

export interface TransactionFiltersProps {
  values: TransactionFilterValues;
  onChange: (values: TransactionFilterValues) => void;
  onReset: () => void;
  isResettable: boolean;
  sort: TransactionSort;
  onSortChange: (sort: TransactionSort) => void;
}

const SORT_OPTIONS: { value: string; label: string; sort: TransactionSort }[] =
  [
    {
      value: 'date-desc',
      label: 'Terbaru',
      sort: { field: 'date', direction: 'desc' },
    },
    {
      value: 'date-asc',
      label: 'Terlama',
      sort: { field: 'date', direction: 'asc' },
    },
    {
      value: 'amount-desc',
      label: 'Nominal tertinggi',
      sort: { field: 'amount', direction: 'desc' },
    },
    {
      value: 'amount-asc',
      label: 'Nominal terendah',
      sort: { field: 'amount', direction: 'asc' },
    },
  ];

export function TransactionFilters({
  values,
  onChange,
  onReset,
  isResettable,
  sort,
  onSortChange,
}: TransactionFiltersProps) {
  const sortValue = `${sort.field}-${sort.direction}`;

  return (
    <Card className="p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            label="Cari transaksi"
            placeholder="cth. kopi, kos, uang saku"
            value={values.search}
            onChange={(event) =>
              onChange({ ...values, search: event.target.value })
            }
          />
        </div>
        <Select
          label="Jenis"
          value={values.type}
          onChange={(event) =>
            onChange({
              ...values,
              type: event.target.value as TransactionType | 'all',
            })
          }
        >
          <option value="all">Semua jenis</option>
          {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map(
            (type) => (
              <option key={type} value={type}>
                {TRANSACTION_TYPE_LABELS[type]}
              </option>
            ),
          )}
        </Select>
        <Select
          label="Kategori"
          value={values.category}
          onChange={(event) =>
            onChange({
              ...values,
              category: event.target.value as TransactionFilterValues['category'],
            })
          }
        >
          <option value="all">Semua kategori</option>
          <optgroup label="Pengeluaran">
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={`expense-${category}`} value={category}>
                {category}
              </option>
            ))}
          </optgroup>
          <optgroup label="Pemasukan">
            {INCOME_CATEGORIES.map((category) => (
              <option key={`income-${category}`} value={category}>
                {category}
              </option>
            ))}
          </optgroup>
        </Select>
        <Input
          label="Dari tanggal"
          type="date"
          value={values.dateFrom}
          onChange={(event) =>
            onChange({ ...values, dateFrom: event.target.value })
          }
        />
        <Input
          label="Sampai tanggal"
          type="date"
          value={values.dateTo}
          onChange={(event) =>
            onChange({ ...values, dateTo: event.target.value })
          }
        />
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:flex-1 md:hidden">
          <Select
            label="Urutkan"
            value={sortValue}
            onChange={(event) => {
              const option = SORT_OPTIONS.find(
                (candidate) => candidate.value === event.target.value,
              );
              if (option) {
                onSortChange(option.sort);
              }
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!isResettable}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset filter
          </Button>
        </div>
      </div>
    </Card>
  );
}
