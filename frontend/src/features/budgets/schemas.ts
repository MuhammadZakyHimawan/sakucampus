import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '@/lib/categories';

export const budgetSchema = z
  .object({
    category: z.string().min(1, 'Kategori wajib dipilih.'),
    limit: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce
        .number({ invalid_type_error: 'Batas anggaran wajib diisi.' })
        .int('Batas anggaran harus bilangan bulat tanpa desimal.')
        .positive('Batas anggaran harus lebih besar dari nol.'),
    ),
    periodStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal mulai wajib dipilih.'),
    periodEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal selesai wajib dipilih.'),
  })
  .superRefine((values, context) => {
    if (!(EXPENSE_CATEGORIES as string[]).includes(values.category)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'Pilih kategori pengeluaran yang valid.',
      });
    }

    if (values.periodEnd < values.periodStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodEnd'],
        message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
      });
    }
  });

export type BudgetFormValues = z.infer<typeof budgetSchema>;
