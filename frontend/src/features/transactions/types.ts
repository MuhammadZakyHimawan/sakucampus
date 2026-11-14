import type {
  TransactionCategory,
  TransactionType,
} from '@/types';

export interface TransactionSort {
  field: 'date' | 'amount';
  direction: 'asc' | 'desc';
}

export interface TransactionFilterValues {
  search: string;
  type: TransactionType | 'all';
  category: TransactionCategory | 'all';
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilterValues = {
  search: '',
  type: 'all',
  category: 'all',
  dateFrom: '',
  dateTo: '',
};

export const DEFAULT_TRANSACTION_SORT: TransactionSort = {
  field: 'date',
  direction: 'desc',
};

export function hasActiveTransactionFilters(
  filters: TransactionFilterValues,
): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''
  );
}
