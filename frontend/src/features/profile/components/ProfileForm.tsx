import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { User } from '@/types';
import { profileSchema } from '../schemas';
import type { ProfileFormValues } from '../schemas';

export interface ProfileFormProps {
  user: User;
  onSubmit: (values: ProfileFormValues) => void;
}

export function ProfileForm({ user, onSubmit }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? '',
    },
  });

  const avatarUrl = watch('avatarUrl');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Pratinjau avatar"
          className="h-16 w-16 rounded-full border border-border object-cover"
        />
      ) : null}
      <Input
        label="Nama"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        hint="Email pada profil demo tidak mengubah kredensial login."
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="URL Avatar (opsional)"
        type="url"
        placeholder="https://contoh.com/foto.jpg"
        hint="Gunakan tautan gambar yang dapat diakses publik."
        error={errors.avatarUrl?.message}
        {...register('avatarUrl')}
      />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
          Simpan Perubahan
        </Button>
      </div>
    </form>
  );
}
