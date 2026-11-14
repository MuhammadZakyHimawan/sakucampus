import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter.')
    .max(80, 'Nama maksimal 80 karakter.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),
  avatarUrl: z
    .union([z.literal(''), z.string().trim().url('URL avatar tidak valid.')])
    .optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi.'),
    newPassword: z
      .string()
      .min(8, 'Password baru minimal 8 karakter.')
      .regex(/[A-Za-z]/, 'Password harus mengandung minimal satu huruf.')
      .regex(/[0-9]/, 'Password harus mengandung minimal satu angka.'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi.'),
  })
  .superRefine((values, context) => {
    if (values.newPassword === values.currentPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'Password baru harus berbeda dari password saat ini.',
      });
    }

    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Konfirmasi password tidak sama.',
      });
    }
  });

export type PasswordFormValues = z.infer<typeof passwordSchema>;
