import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  MessageCircle,
  RefreshCw,
  Send,
  Terminal,
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
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import { isMockApiEnabled } from '@/lib/config';
import {
  connectTelegram,
  createTelegramLinkToken,
  disconnectTelegram,
  fetchTelegramStatus,
  getTelegramStatus,
} from '@/services/telegram.service';
import type { TelegramLinkTokenResponse, TelegramStatus } from '@/types';
import { formatDate } from '@/utils/date';

const CHAT_EXAMPLES = [
  { text: 'makan ayam geprek kantin 22rb', hint: 'Pengeluaran · Kebutuhan Primer' },
  { text: 'beli 2 kopi susu gula aren 36rb', hint: 'Pengeluaran · Gaya Hidup' },
  { text: 'kiriman uang saku bulanan ortu 1,5jt', hint: 'Pemasukan · Uang Saku' },
  { text: 'pindahin saldo bca ke gopay 200k', hint: 'Transfer · Antar akun pribadi' },
];

const BOT_COMMANDS = [
  { cmd: '/saldo', desc: 'Cek saldo berjalan, burn rate, runway & status keuangan' },
  { cmd: '/ringkasan', desc: 'Ringkasan pemasukan, pengeluaran & kategori bulan ini' },
  { cmd: '/budget', desc: 'Pantau realisasi dan sisa anggaran kategori' },
  { cmd: '/goals', desc: 'Lihat progres pencapaian target tabungan' },
  { cmd: '/pdf', desc: 'Kirim file laporan keuangan PDF langsung ke chat' },
  { cmd: '/batal', desc: 'Batalkan transaksi Telegram terakhir (≤ 15 menit)' },
  { cmd: '/bantuan', desc: 'Tampilkan panduan lengkap cara pakai bot' },
];

function formatCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, remainingSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toMockUsername(name: string): string {
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
  const { refresh: refreshFinance } = useFinanceData();
  const { toast } = useToast();
  const isMock = isMockApiEnabled();

  const [status, setStatus] = useState<TelegramStatus>(() =>
    isMock ? getTelegramStatus() : { connected: false, simulated: false },
  );
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(!isMock);
  const [linkToken, setLinkToken] = useState<TelegramLinkTokenResponse | null>(
    null,
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const loadStatus = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoadingStatus(true);
      }
      try {
        const fresh = await fetchTelegramStatus();
        setStatus(fresh);
        if (fresh.connected) {
          setLinkToken(null);
          setSecondsLeft(0);
        }
        return fresh;
      } catch (err) {
        if (!silent) {
          toast({
            title: 'Gagal memuat status Telegram',
            description:
              err instanceof Error ? err.message : 'Silakan muat ulang halaman.',
            variant: 'error',
          });
        }
        return null;
      } finally {
        if (!silent) {
          setIsLoadingStatus(false);
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Countdown timer for active pairing token
  useEffect(() => {
    if (!linkToken) {
      setSecondsLeft(0);
      return;
    }

    const updateRemaining = () => {
      const diff = Math.floor(
        (new Date(linkToken.expiresAt).getTime() - Date.now()) / 1000,
      );
      setSecondsLeft(Math.max(0, diff));
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [linkToken]);

  // Auto-poll GET /telegram/status every 3.5s while waiting for user to press Start in Telegram
  useEffect(() => {
    if (isMock || !linkToken || secondsLeft <= 0 || status.connected) {
      return;
    }

    const pollTimer = window.setInterval(async () => {
      try {
        const fresh = await fetchTelegramStatus();
        if (fresh.connected) {
          setStatus(fresh);
          setLinkToken(null);
          setSecondsLeft(0);
          void refreshFinance();
          toast({
            title: 'Telegram berhasil terhubung!',
            description: `Akun ${fresh.telegramUsername ?? 'Telegram'} kini aktif terhubung ke SakuCampus.`,
            variant: 'success',
          });
        }
      } catch {
        // Abaikan gangguan jaringan sesaat saat polling.
      }
    }, 3500);

    return () => window.clearInterval(pollTimer);
  }, [isMock, linkToken, secondsLeft, status.connected, refreshFinance, toast]);

  const handleConnect = async () => {
    setIsGenerating(true);
    try {
      if (isMock) {
        const connected = await connectTelegram(
          toMockUsername(user?.name ?? 'Mahasiswa'),
        );
        setStatus(connected);
        toast({
          title: 'Simulasi koneksi berhasil',
          description: 'Status Telegram kini terhubung pada mode demo.',
          variant: 'success',
        });
        return;
      }

      const generated = await createTelegramLinkToken();
      setLinkToken(generated);
      setCopied(false);
      toast({
        title: 'Kode tautan dibuat',
        description:
          'Buka bot Telegram dan kirimkan perintah /start dalam waktu 10 menit.',
        variant: 'info',
      });
    } catch (connectError) {
      toast({
        title: 'Gagal membuat tautan Telegram',
        description:
          connectError instanceof Error
            ? connectError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCommand = async () => {
    if (!linkToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(linkToken.startCommand);
      setCopied(true);
      toast({
        title: 'Perintah disalin',
        description: 'Tempelkan dan kirim ke chat Bot SakuCampus di Telegram.',
        variant: 'success',
      });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: 'Salin manual',
        description: linkToken.startCommand,
        variant: 'info',
      });
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
        title: 'Tautan Telegram diputuskan',
        description:
          'Akun Telegram tidak lagi terhubung. Kamu bisa menghubungkannya kembali kapan saja.',
        variant: 'info',
      });
    } catch (disconnectError) {
      toast({
        title: 'Gagal memutuskan tautan',
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

  const isTokenExpired = linkToken !== null && secondsLeft <= 0;
  const displayUsername =
    status.telegramUsername ?? status.username ?? 'Tanpa username publik';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrasi Telegram"
        description="Hubungkan akun Telegram pribadimu untuk mencatat transaksi lewat chat natural dan menerima peringatan dini otomatis."
        actions={
          <>
            {isMock ? (
              <Badge variant="warning">Mode Demo</Badge>
            ) : (
              <Badge variant={status.connected ? 'success' : 'neutral'}>
                {status.connected ? 'Terhubung' : 'Belum Terhubung'}
              </Badge>
            )}
            {status.connected ? (
              <Button
                variant="outline"
                onClick={() => setConfirmDisconnect(true)}
              >
                <Unlink className="h-4 w-4" aria-hidden="true" />
                Putuskan Tautan
              </Button>
            ) : (
              <Button onClick={handleConnect} isLoading={isGenerating}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
                {linkToken ? 'Buat Kode Baru' : 'Hubungkan Telegram'}
              </Button>
            )}
          </>
        }
      />

      {isMock ? (
        <Alert variant="warning" title="Mode Demo Lokal">
          Aplikasi berjalan pada mode mock lokal. Ubah VITE_USE_MOCK_API=false
          untuk menghubungkan ke bot Telegram sesungguhnya.
        </Alert>
      ) : status.botConfigured === false ? (
        <Alert variant="info" title="Token Bot Telegram belum dikonfigurasi di server">
          Server backend belum diisi <code>TELEGRAM_BOT_TOKEN</code> dari
          @BotFather. Kamu tetap dapat membuat kode tautan sekarang, lalu bot
          akan langsung aktif memprosesnya begitu token bot diaktifkan pada{' '}
          <code>backend/.env</code>.
        </Alert>
      ) : null}

      {isLoadingStatus ? (
        <Card>
          <LoadingState message="Memeriksa status tautan Telegram..." />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
            <Card>
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-ink">
                        {status.connected
                          ? 'Akun Telegram Terhubung'
                          : 'Belum Terhubung ke Telegram'}
                      </p>
                      <Badge variant={status.connected ? 'success' : 'neutral'}>
                        {status.connected ? '2 Arah Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-secondary">
                      {status.connected
                        ? 'Setiap pesan transaksi di Telegram otomatis diproses NLP, disimpan ke akunmu, dan dievaluasi oleh Rule Engine.'
                        : 'Tautkan akun SakuCampus milikmu ke akun Telegram pribadi menggunakan kode sekali pakai yang aman.'}
                    </p>
                  </div>
                </div>

                {status.connected ? (
                  <dl className="grid gap-3 rounded-lg border border-border bg-background/50 p-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                        Username Telegram
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-semibold text-ink">
                        {displayUsername}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                        Telegram ID
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-semibold text-ink">
                        {status.telegramUserId ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                        Tanggal Tertaut
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {status.linkedAt
                          ? formatDate(status.linkedAt)
                          : 'Tersambung'}
                      </dd>
                    </div>
                  </dl>
                ) : linkToken ? (
                  <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary-light/30 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink">
                        Selesaikan Penautan di Aplikasi Telegram
                      </p>
                      <Badge variant={isTokenExpired ? 'danger' : 'primary'}>
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {isTokenExpired
                          ? 'Kode Kedaluwarsa'
                          : `Berlaku ${formatCountdown(secondsLeft)}`}
                      </Badge>
                    </div>

                    {isTokenExpired ? (
                      <Alert variant="warning">
                        Masa berlaku kode tautan 10 menit telah habis. Klik
                        tombol <b>Buat Kode Baru</b> untuk melanjutkan.
                      </Alert>
                    ) : (
                      <>
                        <p className="text-xs leading-relaxed text-ink-secondary">
                          Tekan tombol <b>Buka Telegram</b> di bawah lalu klik{' '}
                          <b>Start</b>, atau salin perintah berikut dan kirimkan
                          langsung ke bot{' '}
                          {status.botUsername ? (
                            <span className="font-mono font-semibold text-ink">
                              @{status.botUsername}
                            </span>
                          ) : (
                            'SakuCampus'
                          )}
                          :
                        </p>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-xs font-semibold text-ink">
                            {linkToken.startCommand}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyCommand}
                          >
                            {copied ? (
                              <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            )}
                            {copied ? 'Tersalin' : 'Salin Perintah'}
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          {linkToken.deepLink ? (
                            <a
                              href={linkToken.deepLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                            >
                              <ExternalLink
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              Buka Telegram
                            </a>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void loadStatus(false)}
                          >
                            <RefreshCw
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            Cek Status Sekarang
                          </Button>
                          <span className="text-xs text-ink-secondary">
                            Menunggu konfirmasi otomatis dari Telegram...
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleConnect} isLoading={isGenerating}>
                      <Link2 className="h-4 w-4" aria-hidden="true" />
                      Hubungkan Telegram Sekarang
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Contoh Chat Pencatatan Natural (NLP)</CardTitle>
                  <CardDescription>
                    Kirim kalimat sehari-hari tanpa format kaku — nominal dan
                    kategori dikenali otomatis.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {CHAT_EXAMPLES.map((example) => (
                  <div
                    key={example.text}
                    className="rounded-lg border border-border bg-background/60 p-3"
                  >
                    <p className="font-mono text-xs font-semibold text-ink">
                      &ldquo;{example.text}&rdquo;
                    </p>
                    <p className="mt-1 text-[11px] text-ink-secondary">
                      {example.hint}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                  <Terminal className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Perintah Interaktif Bot</CardTitle>
                  <CardDescription>
                    Gunakan perintah cepat langsung di ruang chat pribadi bot.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {BOT_COMMANDS.map((item) => (
                <div key={item.cmd} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="font-mono text-xs font-bold text-primary-dark">
                    {item.cmd}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                    {item.desc}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Putuskan Tautan Telegram"
        description="Akun Telegram kamu tidak lagi terhubung ke SakuCampus dan tidak akan menerima peringatan otomatis sampai dihubungkan kembali."
        confirmLabel="Putuskan Tautan"
        isLoading={isDisconnecting}
      />
    </div>
  );
}
