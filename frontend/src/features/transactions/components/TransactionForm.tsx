import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/categories';
import type { Transaction, TransactionSource, TransactionType } from '@/types';
import { toISODate } from '@/utils/date';
import { transactionSchema } from '../schemas';
import type { TransactionFormValues } from '../schemas';

export interface TransactionFormProps {
  mode: 'create' | 'edit';
  initialTransaction?: Transaction;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onCancel: () => void;
}

const SOURCE_OPTIONS: { value: TransactionSource; label: string }[] = [
  { value: 'manual', label: 'Website' },
  { value: 'telegram', label: 'Telegram' },
];

const TYPE_OPTIONS: TransactionType[] = ['expense', 'income', 'transfer'];

export function TransactionForm({
  mode,
  initialTransaction,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: initialTransaction?.description ?? '',
      amount: initialTransaction?.amount,
      type: initialTransaction?.type ?? 'expense',
      category: initialTransaction?.category ?? '',
      date: initialTransaction?.date.slice(0, 10) ?? toISODate(new Date()),
      source: initialTransaction?.source ?? 'manual',
      note: initialTransaction?.note ?? '',
    },
  });

  const type = watch('type');
  const previousTypeRef = useRef(type);

  useEffect(() => {
    if (previousTypeRef.current !== type) {
      setValue('category', type === 'transfer' ? 'Lainnya' : '');
      previousTypeRef.current = type;
    }
  }, [type, setValue]);

  const categoryOptions = useMemo(() => {
    if (type === 'income') {
      return INCOME_CATEGORIES;
    }

    if (type === 'transfer') {
      return ['Lainnya'] as const;
    }

    return EXPENSE_CATEGORIES;
  }, [type]);

  const isCategoryLocked = type === 'transfer';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <Input
        label="Deskripsi"
        placeholder="cth. Makan ayam geprek"
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nominal (Rp)"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="cth. 20000"
          hint="Gunakan angka bulat tanpa titik atau koma."
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Input
          label="Tanggal"
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />
        <Select
          label="Jenis Transaksi"
          error={errors.type?.message}
          {...register('type')}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {TRANSACTION_TYPE_LABELS[option]}
            </option>
          ))}
        </Select>
        <Select
          label="Kategori"
          disabled={isCategoryLocked}
          hint={
            isCategoryLocked
              ? 'Transfer menggunakan kategori Lainnya.'
              : undefined
          }
          error={errors.category?.message}
          {...register('category')}
        >
          <option value="" disabled>
            Pilih kategori
          </option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        <Select
          label="Sumber Transaksi"
          hint="Catat lewat website atau simulasi Telegram."
          error={errors.source?.message}
          {...register('source')}
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2">
          <Textarea
            label="Catatan (opsional)"
            rows={3}
            placeholder="cth. Bareng teman kos"
            error={errors.note?.message}
            {...register('note')}
          />
        </div>
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
          {mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Transaksi'}
        </Button>
      </div>
    </form>
  );
}
