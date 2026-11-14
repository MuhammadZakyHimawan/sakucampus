import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Goal } from '@/types';
import { toISODate } from '@/utils/date';
import { goalSchema } from '../schemas';
import type { GoalFormValues } from '../schemas';

export interface GoalFormProps {
  mode: 'create' | 'edit';
  initialGoal?: Goal;
  onSubmit: (values: GoalFormValues) => Promise<void>;
  onCancel: () => void;
}

export function GoalForm({
  mode,
  initialGoal,
  onSubmit,
  onCancel,
}: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initialGoal?.name ?? '',
      targetAmount: initialGoal?.targetAmount,
      deadline: initialGoal?.deadline ?? toISODate(new Date()),
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <Input
        label="Nama Target"
        placeholder="cth. Dana Darurat"
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nominal Target (Rp)"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="cth. 5000000"
          hint="Gunakan angka bulat tanpa titik atau koma."
          error={errors.targetAmount?.message}
          {...register('targetAmount')}
        />
        <Input
          label="Deadline"
          type="date"
          error={errors.deadline?.message}
          {...register('deadline')}
        />
      </div>
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
          {mode === 'edit' ? 'Simpan Perubahan' : 'Buat Target'}
        </Button>
      </div>
    </form>
  );
}
