import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from './auth-context';
import { AuthCard } from './AuthCard';
import { registerSchema } from './schemas';
import type { RegisterFormValues } from './schemas';

export function RegisterPage() {
  const { isAuthenticated, register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
    mode: 'onTouched',
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      toast({
        title: 'Akun demo berhasil dibuat',
        description: `Selamat datang, ${values.name.trim()}.`,
        variant: 'success',
      });
      navigate('/dashboard', { replace: true });
    } catch (registerError) {
      const message =
        registerError instanceof Error
          ? registerError.message
          : 'Pendaftaran gagal. Silakan coba lagi.';
      setError('root', { message });
      toast({
        title: 'Pendaftaran gagal',
        description: message,
        variant: 'error',
      });
    }
  });

  return (
    <AuthCard
      title="Daftar akun"
      description="Buat akun demo untuk mencoba seluruh fitur SakuCampus."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Masuk
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {errors.root?.message ? (
          <Alert variant="danger">{errors.root.message}</Alert>
        ) : null}

        <Input
          label="Nama lengkap"
          autoComplete="name"
          placeholder="Contoh: Andi Pratama"
          error={errors.name?.message}
          {...registerField('name')}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@kampus.ac.id"
          error={errors.email?.message}
          {...registerField('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          hint="Minimal 8 karakter, mengandung huruf dan angka."
          error={errors.password?.message}
          {...registerField('password')}
        />

        <PasswordInput
          label="Konfirmasi password"
          autoComplete="new-password"
          placeholder="Ulangi password"
          error={errors.confirmPassword?.message}
          {...registerField('confirmPassword')}
        />

        <Checkbox
          label="Saya menyetujui syarat dan ketentuan serta kebijakan privasi SakuCampus."
          error={errors.terms?.message}
          {...registerField('terms')}
        />

        <Button
          type="submit"
          className="mt-1 w-full"
          isLoading={isSubmitting}
        >
          Daftar
        </Button>

        <Alert variant="info">
          Pendaftaran ini simulasi. Akun hanya berlaku pada sesi ini dan
          password tidak disimpan.
        </Alert>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-secondary">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          Pendaftaran belum terhubung ke backend, email verifikasi, atau sistem
          keamanan production.
        </p>
      </form>
    </AuthCard>
  );
}
