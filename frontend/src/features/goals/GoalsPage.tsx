import { useEffect, useState } from 'react';
import { CheckCircle2, PiggyBank, Plus, Target, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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
import { MOCK_API_ENABLED } from '@/lib/config';
import { NO_GOALS_MESSAGE } from '@/lib/constants';
import {
  addGoalContribution,
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
} from '@/services/goals.service';
import type { Goal, GoalInput } from '@/types';
import { isGoalAchieved } from '@/utils/calculations';
import { formatCurrency } from '@/utils/currency';
import { GoalCard } from './components/GoalCard';
import { GoalContributionForm } from './components/GoalContributionForm';
import { GoalForm } from './components/GoalForm';
import type { GoalFormValues } from './schemas';

function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((first, second) =>
    first.deadline.localeCompare(second.deadline),
  );
}

export function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    open: boolean;
    goal: Goal | null;
  }>({ open: false, goal: null });
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;

    getGoals()
      .then((data) => {
        if (isActive) {
          setGoals(data);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Target tabungan gagal dimuat.',
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.savedAmount, 0);
  const achievedCount = goals.filter(isGoalAchieved).length;

  const openCreateForm = () => {
    setFormState({ open: true, goal: null });
  };

  const openEditForm = (goal: Goal) => {
    setFormState({ open: true, goal });
  };

  const closeForm = () => {
    setFormState({ open: false, goal: null });
  };

  const handleSubmit = async (values: GoalFormValues) => {
    const input: GoalInput = {
      name: values.name,
      targetAmount: values.targetAmount,
      deadline: values.deadline,
    };

    try {
      if (formState.goal) {
        const updated = await updateGoal(formState.goal.id, input);

        setGoals((current) =>
          sortGoals(
            current.map((goal) => (goal.id === updated.id ? updated : goal)),
          ),
        );
        toast({
          title: 'Target diperbarui',
          description: `Target "${updated.name}" telah disimpan.`,
          variant: 'success',
        });
      } else {
        const created = await createGoal(input);

        setGoals((current) => sortGoals([...current, created]));
        toast({
          title: 'Target dibuat',
          description: `Target "${created.name}" berhasil ditambahkan.`,
          variant: 'success',
        });
      }

      closeForm();
    } catch (mutationError) {
      toast({
        title: 'Gagal menyimpan target',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  const handleContribution = async (amount: number) => {
    if (!contributionGoal) {
      return;
    }

    try {
      const updated = await addGoalContribution(contributionGoal.id, amount);

      setGoals((current) =>
        sortGoals(
          current.map((goal) => (goal.id === updated.id ? updated : goal)),
        ),
      );
      toast({
        title: 'Kontribusi ditambahkan',
        description: `${formatCurrency(amount)} masuk ke target "${updated.name}".`,
        variant: 'success',
      });
      setContributionGoal(null);
    } catch (mutationError) {
      toast({
        title: 'Gagal menambah kontribusi',
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
      await deleteGoal(pendingDelete.id);
      setGoals((current) =>
        current.filter((goal) => goal.id !== pendingDelete.id),
      );
      toast({
        title: 'Target dihapus',
        description: `Target "${pendingDelete.name}" telah dihapus.`,
        variant: 'success',
      });
      setPendingDelete(null);
    } catch (deleteError) {
      toast({
        title: 'Gagal menghapus target',
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
        title="Target Tabungan"
        description="Rencanakan tujuan keuangan dan pantau progres tabunganmu."
        actions={
          <>
            <Badge variant={MOCK_API_ENABLED ? 'primary' : 'success'}>
              {MOCK_API_ENABLED ? 'Data demo' : 'Tersinkron'}
            </Badge>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Target
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Card>
          <LoadingState message="Memuat target tabungan..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} />
        </Card>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="Belum ada target tabungan"
            description={NO_GOALS_MESSAGE}
            action={
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Buat target pertama
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Target"
              value={formatCurrency(totalTarget)}
              icon={Target}
              hint={`Dari ${goals.length} target`}
            />
            <StatCard
              label="Total Terkumpul"
              value={formatCurrency(totalSaved)}
              icon={Wallet}
              tone="success"
              hint={
                totalTarget > 0
                  ? `${Math.round((totalSaved / totalTarget) * 100)}% dari total target`
                  : undefined
              }
            />
            <StatCard
              label="Target Tercapai"
              value={`${achievedCount} target`}
              icon={CheckCircle2}
              tone="info"
              hint={`Sisa ${goals.length - achievedCount} target berjalan`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onContribute={setContributionGoal}
                onEdit={openEditForm}
                onDelete={setPendingDelete}
              />
            ))}
          </div>

          <Card className="flex items-start gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
              <PiggyBank className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-ink">Tips menabung konsisten</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Sisihkan dana di awal bulan, bukan dari sisa pengeluaran. Mulai
                dari nominal kecil yang rutin agar lebih mudah dipertahankan.
              </p>
            </div>
          </Card>
        </>
      )}

      <Modal
        open={formState.open}
        onClose={closeForm}
        title={formState.goal ? 'Edit Target' : 'Tambah Target'}
        description={
          formState.goal
            ? 'Perbarui nama, nominal, atau deadline target tabungan.'
            : 'Tentukan tujuan tabungan dan nominal yang ingin dicapai.'
        }
      >
        <GoalForm
          key={formState.goal?.id ?? 'create'}
          mode={formState.goal ? 'edit' : 'create'}
          initialGoal={formState.goal ?? undefined}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      </Modal>

      <Modal
        open={contributionGoal !== null}
        onClose={() => setContributionGoal(null)}
        title="Tambah Kontribusi"
        description={
          contributionGoal
            ? `Tambahkan dana ke target "${contributionGoal.name}".`
            : undefined
        }
      >
        {contributionGoal ? (
          <GoalContributionForm
            goal={contributionGoal}
            onSubmit={handleContribution}
            onCancel={() => setContributionGoal(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Target"
        description={
          pendingDelete
            ? `Target "${pendingDelete.name}" beserta riwayat progresnya akan dihapus. Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus Target"
        isLoading={isDeleting}
      />
    </div>
  );
}
