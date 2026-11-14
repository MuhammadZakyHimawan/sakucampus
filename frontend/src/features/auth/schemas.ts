import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email wajib diisi.')
  .email('Format email tidak valid.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password wajib diisi.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nama minimal 2 karakter.')
      .max(80, 'Nama maksimal 80 karakter.'),
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter.')
      .regex(/[A-Za-z]/, 'Password harus mengandung minimal satu huruf.')
      .regex(/[0-9]/, 'Password harus mengandung minimal satu angka.'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi.'),
    terms: z
      .boolean()
      .refine((value) => value, 'Kamu perlu menyetujui syarat dan ketentuan.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Konfirmasi password tidak sama.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
