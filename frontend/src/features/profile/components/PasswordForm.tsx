import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { passwordSchema } from '../schemas';
import type { PasswordFormValues } from '../schemas';

export interface PasswordFormProps {
  onSubmit: (values: PasswordFormValues) => Promise<void>;
}

export function PasswordForm({ onSubmit }: PasswordFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
        reset();
      })}
      className="flex flex-col gap-4"
      noValidate
    >
      <PasswordInput
        label="Password saat ini"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <PasswordInput
        label="Password baru"
        autoComplete="new-password"
        hint="Minimal 8 karakter, mengandung huruf dan angka."
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <PasswordInput
        label="Konfirmasi password baru"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <div className="flex justify-end">
        <Button type="submit" variant="outline" isLoading={isSubmitting}>
          Ubah Password
        </Button>
      </div>
    </form>
  );
}
