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
import { isMockApiEnabled } from '@/lib/config';
import { DEMO_USER } from '@/mocks/users';
import { getInitials } from '@/utils/text';
import { PasswordForm } from './components/PasswordForm';
import { ProfileForm } from './components/ProfileForm';
import type { PasswordFormValues, ProfileFormValues } from './schemas';

export function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();
  const isMock = isMockApiEnabled();
  const activeUser = user ?? DEMO_USER;

  const handleProfileSubmit = async (values: ProfileFormValues) => {
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
    } catch (profileError) {
      toast({
        title: 'Gagal memperbarui profil',
        description:
          profileError instanceof Error
            ? profileError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  const handlePasswordSubmit = async (
    values: PasswordFormValues,
  ): Promise<void> => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({
        title: isMock
          ? 'Simulasi ubah password berhasil'
          : 'Password berhasil diperbarui',
        description: isMock
          ? 'Mode demo belum mengubah kredensial login.'
          : 'Gunakan password baru saat masuk pada sesi berikutnya.',
        variant: isMock ? 'info' : 'success',
      });
    } catch (pwError) {
      toast({
        title: 'Gagal mengubah password',
        description:
          pwError instanceof Error ? pwError.message : 'Silakan coba lagi.',
        variant: 'error',
      });
      throw pwError;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profil"
        description="Kelola informasi profil dan keamanan akun SakuCampus milikmu."
        actions={
          <>
            {isMock ? <Badge variant="primary">Akun demo</Badge> : null}
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
              {isMock
                ? 'Data tersimpan pada browser'
                : 'Akun aktif tersinkronisasi'}
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
                  Perbarui password akun secara berkala untuk menjaga keamanan.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isMock ? (
              <Alert variant="info" title="Simulasi keamanan">
                Mode demo belum mengubah kredensial login akun contoh.
              </Alert>
            ) : null}
            <PasswordForm onSubmit={handlePasswordSubmit} />
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 border-danger/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-ink">Keluar dari akun</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Akhiri sesi aktif pada perangkat ini. Kamu dapat masuk kembali kapan
            saja.
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
