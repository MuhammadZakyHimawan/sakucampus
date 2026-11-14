import { z } from 'zod';

export const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama target wajib diisi.')
    .max(60, 'Nama target maksimal 60 karakter.'),
  targetAmount: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ invalid_type_error: 'Nominal target wajib diisi.' })
      .int('Nominal target harus bilangan bulat tanpa desimal.')
      .positive('Nominal target harus lebih besar dari nol.'),
  ),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline wajib dipilih.'),
});

export type GoalFormValues = z.infer<typeof goalSchema>;

export const contributionSchema = z.object({
  amount: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ invalid_type_error: 'Nominal kontribusi wajib diisi.' })
      .int('Nominal kontribusi harus bilangan bulat tanpa desimal.')
      .positive('Nominal kontribusi harus lebih besar dari nol.'),
  ),
});

export type ContributionFormValues = z.infer<typeof contributionSchema>;
