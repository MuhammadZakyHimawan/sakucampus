import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/toast-context';
import { AuthCard } from './AuthCard';
import { forgotPasswordSchema } from './schemas';
import type { ForgotPasswordFormValues } from './schemas';

export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 600);
    });

    setSubmittedEmail(values.email.trim());
    toast({
      title: 'Permintaan reset diterima',
      description: 'Simulasi pengiriman tautan reset berhasil dijalankan.',
      variant: 'success',
    });
  });

  if (submittedEmail) {
    return (
      <AuthCard
        title="Periksa emailmu"
        description="Kami telah memproses permintaan reset password untuk alamat email berikut."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background px-4 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
              <MailCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-ink">{submittedEmail}</p>
            <p className="text-sm leading-relaxed text-ink-secondary">
              Jika email tersebut terdaftar, kamu akan menerima tautan untuk
              membuat password baru.
            </p>
          </div>

          <Alert variant="warning" title="Simulasi">
            Email reset tidak benar-benar dikirim. Fitur ini belum terhubung ke
            layanan email atau backend.
          </Alert>

          <Button
            type="button"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Kembali ke login
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setSubmittedEmail(null)}
          >
            Gunakan email lain
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Lupa password"
      description="Masukkan email akunmu untuk menerima tautan reset password."
      footer={
        <>
          Ingat password?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Kembali ke login
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@kampus.ac.id"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Kirim tautan reset
        </Button>

        <Alert variant="info" title="Simulasi">
          Pada versi MVP ini, tautan reset tidak benar-benar dikirim ke email.
        </Alert>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-secondary">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          Demi keamanan, kami tidak menampilkan apakah sebuah email terdaftar.
        </p>
      </form>
    </AuthCard>
  );
}
