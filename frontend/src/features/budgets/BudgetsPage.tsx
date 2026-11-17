import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { BudgetProgress } from '@/components/ui/BudgetProgress';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/toast-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import { EXPENSE_CATEGORIES } from '@/lib/categories';
import { MOCK_API_ENABLED } from '@/lib/config';
import { NO_BUDGETS_MESSAGE } from '@/lib/constants';
import type { Budget, BudgetInput, ExpenseCategory } from '@/types';
import { computeBudgetUsage, getBudgetStatus } from '@/utils/calculations';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { BudgetForm } from './components/BudgetForm';
import type { BudgetFormValues } from './schemas';

export function BudgetsPage() {
  const {
    budgets,
    transactions,
    isLoading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
  } = useFinanceData();
  const { toast } = useToast();

  const [formState, setFormState] = useState<{
    open: boolean;
    budget: Budget | null;
  }>({ open: false, budget: null });
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const overviewItems = useMemo(
    () =>
      budgets
        .map((budget) => {
          const used = computeBudgetUsage(budget, transactions);
          const percentage =
            budget.limit > 0 ? Math.round((used / budget.limit) * 100) : 0;

          return {
            budget,
            used,
            remaining: budget.limit - used,
            percentage,
            status: getBudgetStatus(used, budget.limit),
          };
        })
        .sort((first, second) => second.percentage - first.percentage),
    [budgets, transactions],
  );

  const totalLimit = useMemo(
    () => budgets.reduce((total, budget) => total + budget.limit, 0),
    [budgets],
  );
  const totalUsed = useMemo(
    () => overviewItems.reduce((total, item) => total + item.used, 0),
    [overviewItems],
  );
  const totalRemaining = totalLimit - totalUsed;

  const availableCategories = useMemo<ExpenseCategory[]>(() => {
    if (formState.budget) {
      return [formState.budget.category];
    }

    const budgetedCategories = new Set(budgets.map((budget) => budget.category));

    return EXPENSE_CATEGORIES.filter(
      (category) => !budgetedCategories.has(category),
    );
  }, [budgets, formState.budget]);

  const canAddBudget = budgets.length < EXPENSE_CATEGORIES.length;

  const openCreateForm = () => {
    setFormState({ open: true, budget: null });
  };

  const openEditForm = (budget: Budget) => {
    setFormState({ open: true, budget });
  };

  const closeForm = () => {
    setFormState({ open: false, budget: null });
  };

  const handleSubmit = async (values: BudgetFormValues) => {
    const input: BudgetInput = {
      category: values.category as ExpenseCategory,
      limit: values.limit,
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
    };

    try {
      if (formState.budget) {
        await updateBudget(formState.budget.id, input);
        toast({
          title: 'Anggaran diperbarui',
          description: `Anggaran ${input.category} telah disimpan.`,
          variant: 'success',
        });
      } else {
        await createBudget(input);
        toast({
          title: 'Anggaran ditambahkan',
          description: `Anggaran ${input.category} berhasil dibuat.`,
          variant: 'success',
        });
      }

      closeForm();
    } catch (mutationError) {
      toast({
        title: 'Gagal menyimpan anggaran',
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
      await deleteBudget(pendingDelete.id);
      toast({
        title: 'Anggaran dihapus',
        description: `Anggaran ${pendingDelete.category} telah dihapus.`,
        variant: 'success',
      });
      setPendingDelete(null);
    } catch (deleteError) {
      toast({
        title: 'Gagal menghapus anggaran',
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Anggaran"
        description="Atur batas pengeluaran per kategori dan pantau realisasinya."
        actions={
          <>
            <Badge variant={MOCK_API_ENABLED ? 'primary' : 'success'}>
              {MOCK_API_ENABLED ? 'Data demo' : 'Tersinkron'}
            </Badge>
            <Button onClick={openCreateForm} disabled={!canAddBudget}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Anggaran
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Card>
          <LoadingState message="Memuat anggaran..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} />
        </Card>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title="Belum ada anggaran"
            description={NO_BUDGETS_MESSAGE}
            action={
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah anggaran pertama
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Anggaran"
              value={formatCurrency(totalLimit)}
              icon={Wallet}
              hint={`Dari ${budgets.length} kategori`}
            />
            <StatCard
              label="Total Terpakai"
              value={formatCurrency(totalUsed)}
              icon={TrendingUp}
              tone="warning"
              hint={
                totalLimit > 0
                  ? `${Math.round((totalUsed / totalLimit) * 100)}% dari total batas`
                  : undefined
              }
            />
            <StatCard
              label="Sisa Anggaran"
              value={formatCurrency(totalRemaining)}
              icon={PiggyBank}
              tone={totalRemaining < 0 ? 'danger' : 'success'}
              hint={
                totalRemaining < 0
                  ? 'Total penggunaan melebihi batas anggaran'
                  : 'Dapat digunakan pada periode berjalan'
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {overviewItems.map((item) => (
              <Card key={item.budget.id} className="flex flex-col gap-3 p-5">
                <BudgetProgress item={item} />
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                  <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(item.budget.periodStart)} –{' '}
                    {formatDate(item.budget.periodEnd)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditForm(item.budget)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-primary-light hover:text-primary-dark"
                      aria-label={`Edit anggaran ${item.budget.category}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item.budget)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                      aria-label={`Hapus anggaran ${item.budget.category}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={formState.open}
        onClose={closeForm}
        title={formState.budget ? 'Edit Anggaran' : 'Tambah Anggaran'}
        description={
          formState.budget
            ? 'Perbarui batas dan periode anggaran kategori terpilih.'
            : 'Buat batas pengeluaran untuk satu kategori pada periode tertentu.'
        }
      >
        {availableCategories.length > 0 || formState.budget ? (
          <BudgetForm
            key={formState.budget?.id ?? 'create'}
            mode={formState.budget ? 'edit' : 'create'}
            availableCategories={availableCategories}
            initialBudget={formState.budget ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Anggaran"
        description={
          pendingDelete
            ? `Anggaran ${pendingDelete.category} sebesar ${formatCurrency(
                pendingDelete.limit,
              )} akan dihapus. Ringkasan anggaran pada dashboard akan diperbarui.`
            : ''
        }
        confirmLabel="Hapus Anggaran"
        isLoading={isDeleting}
      />
    </div>
  );
}
