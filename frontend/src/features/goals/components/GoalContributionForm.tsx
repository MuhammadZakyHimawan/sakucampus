import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Goal } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { contributionSchema } from '../schemas';
import type { ContributionFormValues } from '../schemas';

export interface GoalContributionFormProps {
  goal: Goal;
  onSubmit: (amount: number) => Promise<void>;
  onCancel: () => void;
}

export function GoalContributionForm({
  goal,
  onSubmit,
  onCancel,
}: GoalContributionFormProps) {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: { amount: remaining > 0 ? remaining : undefined },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values.amount))}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="rounded-lg bg-background p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-secondary">Terkumpul</span>
          <span className="font-semibold text-ink">
            {formatCurrency(goal.savedAmount)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="text-ink-secondary">Sisa target</span>
          <span className="font-semibold text-ink">
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>
      <Input
        label="Nominal Kontribusi (Rp)"
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        placeholder="cth. 250000"
        hint="Nominal akan ditambahkan ke dana yang sudah terkumpul."
        error={errors.amount?.message}
        {...register('amount')}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Tambah Kontribusi
        </Button>
      </div>
    </form>
  );
}
