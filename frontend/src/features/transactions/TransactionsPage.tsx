import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ReceiptText,
  SearchX,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import {
  TRANSACTION_TYPE_LABELS,
} from '@/lib/categories';
import { cn } from '@/lib/cn';
import { DEFAULT_PAGE_SIZE } from '@/lib/config';
import { NO_TRANSACTIONS_MESSAGE } from '@/lib/constants';
import { TRANSACTION_VISUALS } from '@/lib/transaction-visuals';
import type { Transaction, TransactionCategory, TransactionInput } from '@/types';
import { getTotalByType } from '@/utils/calculations';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { TransactionForm } from './components/TransactionForm';
import { TransactionFilters } from './components/TransactionFilters';
import { TransactionList } from './components/TransactionList';
import { TransactionTable } from './components/TransactionTable';
import type { TransactionFormValues } from './schemas';
import {
  DEFAULT_TRANSACTION_FILTERS,
  DEFAULT_TRANSACTION_SORT,
  hasActiveTransactionFilters,
} from './types';
import type { TransactionFilterValues, TransactionSort } from './types';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  onChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const start = (page - 1) * DEFAULT_PAGE_SIZE + 1;
  const end = Math.min(page * DEFAULT_PAGE_SIZE, totalItems);

  return (
    <nav
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Navigasi halaman transaksi"
    >
      <p className="text-xs text-ink-secondary">
        Menampilkan {start}–{end} dari {totalItems} transaksi
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Sebelumnya
        </Button>
        <span className="px-2 text-xs font-medium text-ink-secondary">
          Halaman {page} dari {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export function TransactionsPage() {
  const {
    transactions,
    isLoading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinanceData();
  const { toast } = useToast();

  const [filters, setFilters] = useState<TransactionFilterValues>(
    DEFAULT_TRANSACTION_FILTERS,
  );
  const [sort, setSort] = useState<TransactionSort>(DEFAULT_TRANSACTION_SORT);
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState<{
    open: boolean;
    transaction: Transaction | null;
  }>({ open: false, transaction: null });
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  const filteredTransactions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const date = transaction.date.slice(0, 10);

      if (
        search !== '' &&
        !transaction.description.toLowerCase().includes(search)
      ) {
        return false;
      }

      if (filters.type !== 'all' && transaction.type !== filters.type) {
        return false;
      }

      if (filters.category !== 'all' && transaction.category !== filters.category) {
        return false;
      }

      if (filters.dateFrom !== '' && date < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo !== '' && date > filters.dateTo) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];

    sorted.sort((first, second) => {
      const result =
        sort.field === 'date'
          ? first.date.localeCompare(second.date)
          : first.amount - second.amount;

      return sort.direction === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredTransactions, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedTransactions.length / DEFAULT_PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * DEFAULT_PAGE_SIZE;

    return sortedTransactions.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [sortedTransactions, currentPage]);

  const filteredIncome = useMemo(
    () => getTotalByType(filteredTransactions, 'income'),
    [filteredTransactions],
  );
  const filteredExpense = useMemo(
    () => getTotalByType(filteredTransactions, 'expense'),
    [filteredTransactions],
  );

  const openCreateForm = () => {
    setFormState({ open: true, transaction: null });
  };

  const openEditForm = (transaction: Transaction) => {
    setFormState({ open: true, transaction });
  };

  const closeForm = () => {
    setFormState({ open: false, transaction: null });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_TRANSACTION_FILTERS);
  };

  const handleSubmit = async (values: TransactionFormValues) => {
    const input: TransactionInput = {
      description: values.description,
      amount: values.amount,
      type: values.type,
      category: values.category as TransactionCategory,
      date: values.date,
      source: values.source,
      note: values.note?.trim() !== '' ? values.note?.trim() : undefined,
    };

    try {
      if (formState.transaction) {
        await updateTransaction(formState.transaction.id, input);
        toast({
          title: 'Transaksi diperbarui',
          description: `Perubahan pada "${input.description}" telah disimpan.`,
          variant: 'success',
        });
      } else {
        await createTransaction(input);
        toast({
          title: 'Transaksi ditambahkan',
          description: `"${input.description}" berhasil dicatat.`,
          variant: 'success',
        });
      }

      closeForm();
    } catch (mutationError) {
      toast({
        title: 'Gagal menyimpan transaksi',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteTransaction(pendingDelete.id);
      toast({
        title: 'Transaksi dihapus',
        description: `"${pendingDelete.description}" telah dihapus dari daftar.`,
        variant: 'success',
      });

      if (detail?.id === pendingDelete.id) {
        setDetail(null);
      }

      setPendingDelete(null);
    } catch (deleteError) {
      toast({
        title: 'Gagal menghapus transaksi',
        description:
          deleteError instanceof Error
            ? deleteError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const detailVisual = detail ? TRANSACTION_VISUALS[detail.type] : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transaksi"
        description="Catat, cari, dan kelola seluruh transaksi pemasukan dan pengeluaran."
        actions={
          <>
            <Badge variant="primary">Data demo</Badge>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Transaksi
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Card>
          <LoadingState message="Memuat transaksi..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} />
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title="Belum ada transaksi"
            description={NO_TRANSACTIONS_MESSAGE}
            action={
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Catat transaksi pertama
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <TransactionFilters
            values={filters}
            onChange={setFilters}
            onReset={resetFilters}
            isResettable={hasActiveTransactionFilters(filters)}
            sort={sort}
            onSortChange={setSort}
          />

          {sortedTransactions.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title="Tidak ada transaksi yang cocok"
                description="Coba ubah kata kunci pencarian atau reset filter untuk melihat semua transaksi."
                action={
                  <Button variant="outline" onClick={resetFilters}>
                    Reset filter
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <Card className="hidden flex-col md:flex">
                <CardHeader>
                  <div>
                    <CardTitle>Daftar Transaksi</CardTitle>
                    <CardDescription>
                      Pemasukan {formatCurrency(filteredIncome)} · Pengeluaran{' '}
                      {formatCurrency(filteredExpense)} · Selisih{' '}
                      {formatCurrency(filteredIncome - filteredExpense)}
                    </CardDescription>
                  </div>
                  <Badge variant="neutral">
                    {sortedTransactions.length} transaksi
                  </Badge>
                </CardHeader>
                <TransactionTable
                  transactions={paginatedTransactions}
                  sort={sort}
                  onSortChange={setSort}
                  onDetail={setDetail}
                  onEdit={openEditForm}
                  onDelete={setPendingDelete}
                />
                {totalPages > 1 ? (
                  <CardFooter>
                    <PaginationControls
                      page={currentPage}
                      totalPages={totalPages}
                      totalItems={sortedTransactions.length}
                      onChange={setPage}
                    />
                  </CardFooter>
                ) : null}
              </Card>

              <div className="flex flex-col gap-3 md:hidden">
                <p className="px-1 text-xs text-ink-secondary">
                  Pemasukan {formatCurrency(filteredIncome)} · Pengeluaran{' '}
                  {formatCurrency(filteredExpense)} ·{' '}
                  {sortedTransactions.length} transaksi
                </p>
                <TransactionList
                  transactions={paginatedTransactions}
                  onDetail={setDetail}
                  onEdit={openEditForm}
                  onDelete={setPendingDelete}
                />
                <PaginationControls
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={sortedTransactions.length}
                  onChange={setPage}
                />
              </div>
            </>
          )}
        </>
      )}

      <Modal
        open={formState.open}
        onClose={closeForm}
        title={formState.transaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
        description={
          formState.transaction
            ? 'Perbarui informasi transaksi yang sudah tercatat.'
            : 'Catat pemasukan, pengeluaran, atau transfer baru.'
        }
      >
        <TransactionForm
          key={formState.transaction?.id ?? 'create'}
          mode={formState.transaction ? 'edit' : 'create'}
          initialTransaction={formState.transaction ?? undefined}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Detail Transaksi"
        description="Ringkasan lengkap transaksi terpilih."
        footer={
          detail ? (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Tutup
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  openEditForm(detail);
                  setDetail(null);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setPendingDelete(detail);
                  setDetail(null);
                }}
              >
                Hapus
              </Button>
            </>
          ) : null
        }
      >
        {detail && detailVisual ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  detailVisual.iconContainer,
                )}
              >
                <detailVisual.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">
                  {detail.description}
                </p>
                <p
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    detailVisual.amount,
                  )}
                >
                  {detailVisual.prefix}
                  {formatCurrency(detail.amount)}
                </p>
              </div>
            </div>
            <dl className="flex flex-col divide-y divide-border rounded-lg border border-border">
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-sm text-ink-secondary">Jenis</dt>
                <dd className="text-sm font-medium text-ink">
                  {TRANSACTION_TYPE_LABELS[detail.type]}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-sm text-ink-secondary">Kategori</dt>
                <dd className="text-sm font-medium text-ink">
                  {detail.category}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-sm text-ink-secondary">Tanggal</dt>
                <dd className="text-sm font-medium text-ink">
                  {formatDate(detail.date)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-sm text-ink-secondary">Sumber</dt>
                <dd className="text-sm font-medium text-ink">
                  {detail.source === 'telegram' ? 'Telegram' : 'Website'}
                </dd>
              </div>
              {detail.note ? (
                <div className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <dt className="text-sm text-ink-secondary">Catatan</dt>
                  <dd className="max-w-[60%] text-right text-sm font-medium text-ink">
                    {detail.note}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Perubahan pada transaksi akan otomatis tercermin pada dashboard.
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Transaksi"
        description={
          pendingDelete
            ? `Transaksi "${pendingDelete.description}" sebesar ${formatCurrency(
                pendingDelete.amount,
              )} akan dihapus. Saldo dan grafik pada dashboard akan diperbarui.`
            : ''
        }
        confirmLabel="Hapus Transaksi"
        isLoading={isDeleting}
      />
    </div>
  );
}
