import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Wand2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useToast } from '@/components/ui/toast-context';
import { MOCK_API_ENABLED } from '@/lib/config';
import { DEMO_CREDENTIALS } from '@/mocks/users';
import { useAuth } from './auth-context';
import { AuthCard } from './AuthCard';
import { loginSchema } from './schemas';
import type { LoginFormValues } from './schemas';

export function LoginPage() {
  const { isAuthenticated, isLoggingIn, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const state = location.state as { from?: string } | null;
  const from = state?.from ?? '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const fillDemoCredentials = () => {
    setValue('email', DEMO_CREDENTIALS.email, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('password', DEMO_CREDENTIALS.password, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
      toast({
        title: 'Berhasil masuk',
        description: 'Selamat datang kembali di SakuCampus.',
        variant: 'success',
      });
      navigate(from, { replace: true });
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : 'Login gagal. Silakan coba lagi.';
      setError('root', { message });
      toast({
        title: 'Login gagal',
        description: message,
        variant: 'error',
      });
    }
  });

  return (
    <AuthCard
      title="Masuk ke SakuCampus"
      description={
        MOCK_API_ENABLED
          ? 'Gunakan akun demo untuk melanjutkan. Akun hasil registrasi hanya aktif selama sesi berlangsung.'
          : 'Masuk dengan email dan password akun SakuCampusmu.'
      }
      footer={
        <>
          Belum punya akun?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary hover:underline"
          >
            Daftar
          </Link>{' '}
          ·{' '}
          <Link
            to="/forgot-password"
            className="font-semibold text-primary hover:underline"
          >
            Lupa password
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {MOCK_API_ENABLED ? (
          <div className="rounded-lg border border-border bg-background p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink">Akun demo</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fillDemoCredentials}
                className="-my-1 px-2"
              >
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                Isi otomatis
              </Button>
            </div>
            <p className="mt-1 text-ink-secondary">
              Email:{' '}
              <span className="font-medium text-ink">
                {DEMO_CREDENTIALS.email}
              </span>
            </p>
            <p className="text-ink-secondary">
              Password:{' '}
              <span className="font-medium text-ink">
                {DEMO_CREDENTIALS.password}
              </span>
            </p>
          </div>
        ) : null}

        {errors.root?.message ? (
          <Alert variant="danger">{errors.root.message}</Alert>
        ) : null}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@kampus.ac.id"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Masukkan password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          className="mt-1 w-full"
          isLoading={isSubmitting || isLoggingIn}
        >
          Masuk
        </Button>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-secondary">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {MOCK_API_ENABLED
            ? 'Simulasi — autentikasi belum terhubung ke backend dan bukan sistem keamanan production.'
            : 'Sesi login diamankan dengan token akses. Jangan bagikan password kepada siapa pun.'}
        </p>
      </form>
    </AuthCard>
  );
}
