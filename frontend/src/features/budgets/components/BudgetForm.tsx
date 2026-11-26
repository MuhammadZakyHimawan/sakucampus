import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Budget, ExpenseCategory } from '@/types';
import { getMonthRange } from '@/utils/period';
import { budgetSchema } from '../schemas';
import type { BudgetFormValues } from '../schemas';

export interface BudgetFormProps {
  mode: 'create' | 'edit';
  availableCategories: ExpenseCategory[];
  initialBudget?: Budget;
  onSubmit: (values: BudgetFormValues) => Promise<void>;
  onCancel: () => void;
}

export function BudgetForm({
  mode,
  availableCategories,
  initialBudget,
  onSubmit,
  onCancel,
}: BudgetFormProps) {
  const monthRange = getMonthRange();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: initialBudget?.category ?? availableCategories[0] ?? '',
      limit: initialBudget?.limit,
      periodStart: initialBudget?.periodStart ?? monthRange.start,
      periodEnd: initialBudget?.periodEnd ?? monthRange.end,
    },
  });

  const isCategoryLocked = mode === 'edit';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <Select
        label="Kategori Pengeluaran"
        disabled={isCategoryLocked}
        hint={
          isCategoryLocked
            ? 'Kategori tidak dapat diubah saat mengedit anggaran.'
            : 'Kamu dapat membuat anggaran kategori yang sama untuk periode bulan/minggu berbeda.'
        }
        error={errors.category?.message}
        {...register('category')}
      >
        <option value="" disabled>
          Pilih kategori
        </option>
        {availableCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Batas Anggaran (Rp)"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="cth. 500000"
          hint="Gunakan angka bulat tanpa titik atau koma."
          error={errors.limit?.message}
          {...register('limit')}
        />
        <Input
          label="Periode Mulai"
          type="date"
          error={errors.periodStart?.message}
          {...register('periodStart')}
        />
        <Input
          label="Periode Selesai"
          type="date"
          error={errors.periodEnd?.message}
          {...register('periodEnd')}
        />
      </div>
      <p className="text-xs text-ink-secondary">
        Realisasi anggaran dihitung otomatis dari transaksi pengeluaran pada
        kategori dan periode yang dipilih.
      </p>
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
          {mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Anggaran'}
        </Button>
      </div>
    </form>
  );
}
