import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  MessageCircle,
  PencilLine,
  Send,
  ShieldCheck,
  Unlink,
} from 'lucide-react';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { MOCK_API_ENABLED } from '@/lib/config';
import {
  connectTelegram,
  createTelegramLinkToken,
  disconnectTelegram,
  getTelegramStatus,
} from '@/services/telegram.service';
import type { TelegramLinkToken, TelegramStatus } from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';

const BENEFITS = [
  {
    icon: PencilLine,
    title: 'Catat lebih cepat',
    description:
      'Kirim pesan singkat untuk mencatat pengeluaran tanpa membuka website.',
  },
  {
    icon: Bell,
    title: 'Pengingat tepat waktu',
    description:
      'Terima peringatan saat anggaran atau saldo mulai mendekati batas.',
  },
  {
    icon: BarChart3,
    title: 'Ringkasan harian',
    description:
      'Lihat rangkuman pengeluaran dan progres target langsung dari chat.',
  },
];

const MOCK_STEPS = [
  'Tekan tombol "Hubungkan Telegram" pada halaman ini.',
  'Ikuti proses simulasi penghubungan akun demo.',
  'Setelah terhubung, transaksi dari Telegram akan ditandai pada daftar transaksi.',
];

const LIVE_STEPS = [
  'Tekan tombol "Buka Telegram" untuk membuka tautan aktivasi.',
  'Tekan Start pada bot untuk menghubungkan akun Telegram-mu.',
  'Kembali ke halaman ini dan perbarui status koneksi.',
];

function toTelegramUsername(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);

  return `@${base || 'mahasiswa'}`;
}

export function TelegramSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [linkToken, setLinkToken] = useState<TelegramLinkToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      setStatus(await getTelegramStatus());
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Status Telegram gagal dimuat. Silakan coba lagi.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setLoadError(null);

    try {
      if (MOCK_API_ENABLED) {
        const connected = await connectTelegram(
          toTelegramUsername(user?.name ?? 'Mahasiswa'),
        );

        setStatus(connected);
        setLinkToken(null);
        toast({
          title: 'Simulasi koneksi berhasil',
          description:
            'Status Telegram kini terhubung pada data demo. Tidak ada bot sungguhan yang terhubung.',
          variant: 'success',
        });
        return;
      }

      const token = await createTelegramLinkToken();

      if (token.simulated || !token.deepLink) {
        setLoadError(
          'Bot Telegram belum dikonfigurasi pada backend. Isi kredensial bot untuk memakai tautan aktivasi sungguhan, atau gunakan mode mock untuk simulasi.',
        );
        toast({
          title: 'Bot belum dikonfigurasi',
          description: 'Tautan aktivasi Telegram belum tersedia.',
          variant: 'info',
        });
        return;
      }

      setLinkToken(token);
      toast({
        title: 'Tautan aktivasi dibuat',
        description: 'Buka tautan Telegram, lalu perbarui status koneksi.',
        variant: 'success',
      });
    } catch (connectError) {
      toast({
        title: 'Gagal menghubungkan Telegram',
        description:
          connectError instanceof Error
            ? connectError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      const disconnected = await disconnectTelegram();

      setStatus(disconnected);
      setLinkToken(null);
      setConfirmDisconnect(false);
      toast({
        title: 'Telegram diputuskan',
        description: MOCK_API_ENABLED
          ? 'Status integrasi simulasi telah diputuskan.'
          : 'Koneksi Telegram akun kamu telah diputuskan.',
        variant: 'info',
      });
    } catch (disconnectError) {
      toast({
        title: 'Gagal memutuskan Telegram',
        description:
          disconnectError instanceof Error
            ? disconnectError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const header = (
    <PageHeader
      title="Integrasi Telegram"
      description="Hubungkan akun Telegram agar transaksi dapat dicatat lewat chat."
      actions={
        <>
          <Badge
            variant={
              status?.simulated
                ? 'warning'
                : status?.connected
                  ? 'success'
                  : 'neutral'
            }
          >
            {status?.simulated
              ? 'Simulasi'
              : status?.connected
                ? 'Aktif'
                : 'Belum aktif'}
          </Badge>
          {status?.connected ? (
            <Button
              variant="outline"
              onClick={() => setConfirmDisconnect(true)}
            >
              <Unlink className="h-4 w-4" aria-hidden="true" />
              Putuskan Koneksi
            </Button>
          ) : (
            <Button onClick={handleConnect} isLoading={isConnecting}>
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Hubungkan Telegram
            </Button>
          )}
        </>
      }
    />
  );

  if (isLoading && !status) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <LoadingState message="Memuat status Telegram..." />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <ErrorState
            title="Status Telegram gagal dimuat"
            message={loadError ?? undefined}
            onRetry={() => void loadStatus()}
          />
        </Card>
      </div>
    );
  }

  const isSimulated = status.simulated ?? false;
  const steps = linkToken?.deepLink ? LIVE_STEPS : MOCK_STEPS;

  return (
    <div className="flex flex-col gap-6">
      {header}

      {loadError ? (
        <Alert variant="danger" title="Perhatian">
          {loadError}
        </Alert>
      ) : isSimulated ? (
        <Alert
          variant="warning"
          title={
            MOCK_API_ENABLED
              ? 'Simulasi — integrasi Telegram belum aktif'
              : 'Bot Telegram belum dikonfigurasi'
          }
        >
          {MOCK_API_ENABLED
            ? 'Tidak ada bot, webhook, atau pengiriman data sungguhan ke Telegram pada mode demo ini.'
            : 'Backend siap menerima webhook, tetapi kredensial bot belum diisi. Isi variabel TELEGRAM_* pada backend untuk mengaktifkan tautan sungguhan.'}
        </Alert>
      ) : null}

      {linkToken?.deepLink ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tautan aktivasi Telegram</CardTitle>
              <CardDescription>
                Buka tautan di bawah, tekan Start pada bot, lalu perbarui status.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <a
              href={linkToken.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Buka Telegram
            </a>
            <p className="flex items-center gap-2 text-xs text-ink-secondary">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Tautan berlaku sampai {formatDateTime(linkToken.expiresAt)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadStatus()}
              isLoading={isLoading}
            >
              Perbarui Status
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
                <Send className="h-10 w-10" aria-hidden="true" />
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface text-success">
                  {status.connected ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-ink">
                    {status.connected
                      ? isSimulated
                        ? 'Terhubung (simulasi)'
                        : 'Terhubung'
                      : 'Belum terhubung'}
                  </p>
                  <Badge variant={status.connected ? 'success' : 'neutral'}>
                    {status.connected ? 'Aktif' : 'Tidak aktif'}
                  </Badge>
                </div>
                <p className="mt-1 max-w-lg text-sm text-ink-secondary">
                  {status.connected
                    ? isSimulated
                      ? 'Akun demo ini tercatat terhubung pada penyimpanan lokal. Semua aktivitas masih berupa simulasi.'
                      : 'Akun Telegram-mu terhubung. Kirim pesan seperti “makan ayam 20rb” untuk mencatat transaksi.'
                    : 'Hubungkan akun untuk mencatat transaksi melalui Telegram.'}
                </p>
              </div>
            </div>

            {status.connected ? (
              <dl className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                    Username Telegram
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-ink">
                    {status.username ?? '@mahasiswa'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                    Tanggal Koneksi
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">
                    {status.linkedAt
                      ? formatDate(status.linkedAt)
                      : 'Tidak tersedia'}
                  </dd>
                </div>
              </dl>
            ) : (
              <Button
                onClick={handleConnect}
                isLoading={isConnecting}
                className="w-fit"
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Hubungkan Telegram
              </Button>
            )}

            <div>
              <p className="font-semibold text-ink">Langkah Aktivasi</p>
              <ol className="mt-2 flex flex-col gap-2">
                {steps.map((step, index) => (
                  <li
                    key={step}
                    className="flex items-start gap-3 text-sm text-ink-secondary"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary-dark">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Yang Bisa Dilakukan</CardTitle>
              <CardDescription>
                Manfaat integrasi Telegram di SakuCampus.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div key={benefit.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {benefit.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="mt-1 flex items-start gap-2 rounded-lg bg-background p-3 text-xs text-ink-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              Kode bot dan secret webhook disimpan hanya di backend, tidak di
              aplikasi website.
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Putuskan Koneksi Telegram"
        description="Koneksi Telegram akan diputuskan. Kamu dapat menghubungkannya kembali kapan saja."
        confirmLabel="Putuskan Koneksi"
        isLoading={isDisconnecting}
      />
    </div>
  );
}
