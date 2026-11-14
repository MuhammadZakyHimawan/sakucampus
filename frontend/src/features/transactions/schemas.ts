import { z } from 'zod';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories';

export const transactionSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, 'Deskripsi wajib diisi.')
      .max(120, 'Deskripsi maksimal 120 karakter.'),
    amount: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce
        .number({ invalid_type_error: 'Nominal wajib diisi.' })
        .int('Nominal harus bilangan bulat tanpa desimal.')
        .positive('Nominal harus lebih besar dari nol.'),
    ),
    type: z.enum(['income', 'expense', 'transfer'], {
      errorMap: () => ({ message: 'Jenis transaksi wajib dipilih.' }),
    }),
    category: z.string().min(1, 'Kategori wajib dipilih.'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal wajib dipilih.'),
    source: z.enum(['manual', 'telegram'], {
      errorMap: () => ({ message: 'Sumber transaksi wajib dipilih.' }),
    }),
    note: z.string().trim().max(200, 'Catatan maksimal 200 karakter.').optional(),
  })
  .superRefine((values, context) => {
    const isValid =
      (values.type === 'expense' &&
        (EXPENSE_CATEGORIES as string[]).includes(values.category)) ||
      (values.type === 'income' &&
        (INCOME_CATEGORIES as string[]).includes(values.category)) ||
      (values.type === 'transfer' && values.category === 'Lainnya');

    if (!isValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'Kategori tidak sesuai dengan jenis transaksi.',
      });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionSchema>;
