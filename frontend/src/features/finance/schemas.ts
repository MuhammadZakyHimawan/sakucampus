import { z } from 'zod';

export const financeSettingsSchema = z.object({
  initialBalance: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ invalid_type_error: 'Saldo awal wajib diisi.' })
      .int('Saldo awal harus bilangan bulat tanpa desimal.')
      .min(0, 'Saldo awal tidak boleh negatif.'),
  ),
  minBalance: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ invalid_type_error: 'Batas saldo minimum wajib diisi.' })
      .int('Batas saldo minimum harus bilangan bulat tanpa desimal.')
      .min(0, 'Batas saldo minimum tidak boleh negatif.'),
  ),
  period: z.enum(['7d', '30d', 'month'], {
    errorMap: () => ({ message: 'Periode keuangan wajib dipilih.' }),
  }),
  notifyBudget: z.boolean(),
  notifyBalance: z.boolean(),
  notifyGoal: z.boolean(),
});

export type FinanceSettingsFormValues = z.infer<typeof financeSettingsSchema>;
