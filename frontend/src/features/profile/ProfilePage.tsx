import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { useLogout } from '@/features/auth/useLogout';
import { DEMO_USER } from '@/mocks/users';
import { MOCK_API_ENABLED } from '@/lib/config';
import { getInitials } from '@/utils/text';
import { PasswordForm } from './components/PasswordForm';
import { ProfileForm } from './components/ProfileForm';
import type { PasswordFormValues, ProfileFormValues } from './schemas';

export function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();
  const activeUser = user ?? DEMO_USER;

  const handleProfileSubmit = async (
    values: ProfileFormValues,
  ): Promise<void> => {
    try {
      await updateProfile({
        name: values.name,
        email: values.email,
        avatarUrl: values.avatarUrl?.trim() || undefined,
      });
      toast({
        title: 'Profil diperbarui',
        description: 'Perubahan informasi akun telah disimpan.',
        variant: 'success',
      });
    } catch (saveError) {
      toast({
        title: 'Gagal memperbarui profil',
        description:
          saveError instanceof Error ? saveError.message : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  const handlePasswordSubmit = async (
    values: PasswordFormValues,
  ): Promise<void> => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast({
        title: 'Password diperbarui',
        description: MOCK_API_ENABLED
          ? 'Password demo untuk sesi ini telah diubah.'
          : 'Password akunmu telah berhasil diubah.',
        variant: 'success',
      });
    } catch (saveError) {
      toast({
        title: 'Gagal mengubah password',
        description:
          saveError instanceof Error ? saveError.message : 'Silakan coba lagi.',
        variant: 'error',
      });
      throw saveError;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profil"
        description="Kelola informasi akun dan keamanan akunmu."
        actions={
          <>
            <Badge variant={MOCK_API_ENABLED ? 'primary' : 'success'}>
              {MOCK_API_ENABLED ? 'Akun demo' : 'Tersinkron'}
            </Badge>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Keluar
            </Button>
          </>
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {activeUser.avatarUrl ? (
            <img
              src={activeUser.avatarUrl}
              alt={`Avatar ${activeUser.name}`}
              className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
              {getInitials(activeUser.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-ink">
              {activeUser.name}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {activeUser.email}
            </p>
            <p className="mt-1 text-xs text-ink-secondary">
              Mata uang {activeUser.currency} ·{' '}
              {MOCK_API_ENABLED
                ? 'Data tersimpan pada browser'
                : 'Akun tersinkron dengan server'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Informasi Akun</CardTitle>
                <CardDescription>
                  Perbarui nama, email, dan avatar profilmu.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm
              key={`${activeUser.name}|${activeUser.email}|${activeUser.avatarUrl ?? ''}`}
              user={activeUser}
              onSubmit={handleProfileSubmit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Keamanan</CardTitle>
                <CardDescription>
                  {MOCK_API_ENABLED
                    ? 'Ubah password melalui simulasi antarmuka demo.'
                    : 'Perbarui password akunmu secara aman.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert
              variant={MOCK_API_ENABLED ? 'info' : 'warning'}
              title={MOCK_API_ENABLED ? 'Simulasi keamanan' : 'Keamanan akun'}
            >
              {MOCK_API_ENABLED
                ? 'Versi demo belum terhubung ke backend. Password demo hanya berubah untuk sesi ini dan akan kembali saat halaman dimuat ulang.'
                : 'Setelah password diubah, gunakan password baru untuk login berikutnya. Sesi saat ini tetap aktif.'}
            </Alert>
            <PasswordForm onSubmit={handlePasswordSubmit} />
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 border-danger/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-ink">Keluar dari akun</p>
          <p className="mt-1 text-sm text-ink-secondary">
            {MOCK_API_ENABLED
              ? 'Kamu dapat masuk kembali menggunakan akun demo yang tertera pada halaman login.'
              : 'Kamu dapat masuk kembali menggunakan email dan password akunmu.'}
          </p>
        </div>
        <Button variant="danger" onClick={logout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar Sekarang
        </Button>
      </Card>
    </div>
  );
}
