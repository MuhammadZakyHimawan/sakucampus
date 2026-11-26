import { useMemo, useState } from 'react';
import { Bell, BellOff, CheckCheck, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import { cn } from '@/lib/cn';
import { isMockApiEnabled } from '@/lib/config';
import {
  NO_NOTIFICATIONS_MESSAGE,
  NO_UNREAD_NOTIFICATIONS_MESSAGE,
} from '@/lib/constants';
import type {
  AppNotification,
  FinancePreferences,
  NotificationType,
} from '@/types';
import { NotificationItem } from './components/NotificationItem';

type NotificationTab = 'all' | 'unread';

const TAB_OPTIONS: { value: NotificationTab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'unread', label: 'Belum Dibaca' },
];

const PREFERENCE_ITEMS: {
  key: keyof Pick<
    FinancePreferences,
    'notifyBudget' | 'notifyBalance' | 'notifyGoal'
  >;
  type: NotificationType;
  label: string;
  description: string;
}[] = [
  {
    key: 'notifyBudget',
    type: 'budget',
    label: 'Peringatan anggaran',
    description:
      'Tampilkan notifikasi saat anggaran hampir atau sudah terlampaui.',
  },
  {
    key: 'notifyBalance',
    type: 'balance',
    label: 'Peringatan saldo & burn rate',
    description:
      'Tampilkan notifikasi saat saldo menipis atau laju pengeluaran tinggi.',
  },
  {
    key: 'notifyGoal',
    type: 'goal',
    label: 'Pembaruan target tabungan',
    description: 'Tampilkan info progres dan pencapaian target tabungan.',
  },
];

function isNotificationEnabled(
  type: NotificationType,
  preferences: Pick<
    FinancePreferences,
    'notifyBudget' | 'notifyBalance' | 'notifyGoal'
  >,
): boolean {
  if (type === 'budget') {
    return preferences.notifyBudget;
  }

  if (type === 'balance') {
    return preferences.notifyBalance;
  }

  if (type === 'goal') {
    return preferences.notifyGoal;
  }

  return true;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    notifications,
    financeSettings,
    isLoading,
    error,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    saveFinanceSettings,
  } = useFinanceData();
  const isMock = isMockApiEnabled();

  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        isNotificationEnabled(notification.type, financeSettings),
      ),
    [notifications, financeSettings],
  );

  const unreadCount = visibleNotifications.filter(
    (notification) => !notification.read,
  ).length;
  const displayedNotifications =
    activeTab === 'unread'
      ? visibleNotifications.filter((notification) => !notification.read)
      : visibleNotifications;

  const updatePreference = async (
    key: keyof Pick<
      FinancePreferences,
      'notifyBudget' | 'notifyBalance' | 'notifyGoal'
    >,
    checked: boolean,
  ) => {
    try {
      await saveFinanceSettings({ [key]: checked });
    } catch (prefError) {
      toast({
        title: 'Gagal menyimpan preferensi',
        description:
          prefError instanceof Error
            ? prefError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  const handleMarkRead = async (notification: AppNotification) => {
    try {
      await markNotificationRead(notification.id);
    } catch (mutationError) {
      toast({
        title: 'Gagal menandai notifikasi',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
      } catch (mutationError) {
        toast({
          title: 'Gagal membuka notifikasi',
          description:
            mutationError instanceof Error
              ? mutationError.message
              : 'Silakan coba lagi.',
          variant: 'error',
        });
        return;
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDelete = async (notification: AppNotification) => {
    try {
      await deleteNotification(notification.id);
      toast({
        title: 'Notifikasi dihapus',
        description: 'Notifikasi telah dihapus dari daftar.',
        variant: 'success',
      });
    } catch (deleteError) {
      toast({
        title: 'Gagal menghapus notifikasi',
        description:
          deleteError instanceof Error
            ? deleteError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);

    try {
      await markAllNotificationsRead();
      toast({
        title: 'Semua notifikasi dibaca',
        description: 'Daftar notifikasi sudah ditandai sebagai dibaca.',
        variant: 'success',
      });
    } catch (mutationError) {
      toast({
        title: 'Gagal menandai semua notifikasi',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const hiddenByPreferenceCount =
    notifications.length - visibleNotifications.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifikasi"
        description="Pantau peringatan dini anggaran, ketahanan saldo, dan progres target tabunganmu."
        actions={
          <>
            <Badge variant={unreadCount > 0 ? 'primary' : 'neutral'}>
              {unreadCount} belum dibaca
            </Badge>
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              isLoading={isMarkingAll}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Tandai semua dibaca
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Preferensi Notifikasi</CardTitle>
              <CardDescription>
                {isMock
                  ? 'Pilih jenis notifikasi yang ingin ditampilkan pada versi demo.'
                  : 'Atur jenis peringatan otomatis yang dicatat dan dikirimkan ke Telegram.'}
              </CardDescription>
            </div>
          </div>
          <Badge variant="neutral">Tersimpan otomatis</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {PREFERENCE_ITEMS.map((item) => (
            <Checkbox
              key={item.key}
              label={
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="text-xs text-ink-secondary">
                    {item.description}
                  </span>
                </span>
              }
              checked={financeSettings[item.key]}
              onChange={(event) =>
                void updatePreference(item.key, event.target.checked)
              }
            />
          ))}
          {hiddenByPreferenceCount > 0 ? (
            <p className="text-xs text-ink-secondary sm:col-span-3">
              {hiddenByPreferenceCount} notifikasi disembunyikan oleh preferensi
              saat ini. Evaluasi bulanan tetap selalu ditampilkan.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div
          className="inline-flex w-fit rounded-lg border border-border bg-surface p-1"
          role="tablist"
          aria-label="Filter notifikasi"
        >
          {TAB_OPTIONS.map((tab) => {
            const isActive = tab.value === activeTab;
            const count =
              tab.value === 'unread'
                ? unreadCount
                : visibleNotifications.length;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-ink-secondary hover:bg-background hover:text-ink',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-background text-ink-secondary',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <Card>
            <LoadingState message="Memuat notifikasi..." />
          </Card>
        ) : error ? (
          <Card>
            <ErrorState message={error} />
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <EmptyState
              icon={BellOff}
              title="Belum ada notifikasi"
              description={NO_NOTIFICATIONS_MESSAGE}
            />
          </Card>
        ) : visibleNotifications.length === 0 ? (
          <Card>
            <EmptyState
              icon={BellOff}
              title="Tidak ada notifikasi yang ditampilkan"
              description="Semua jenis notifikasi sedang dimatikan pada preferensi. Aktifkan salah satu preferensi untuk melihat notifikasi terkait."
            />
          </Card>
        ) : displayedNotifications.length === 0 ? (
          <Card>
            <EmptyState
              icon={Bell}
              title="Semua notifikasi sudah dibaca"
              description={NO_UNREAD_NOTIFICATIONS_MESSAGE}
              action={
                <Button variant="outline" onClick={() => setActiveTab('all')}>
                  Lihat semua notifikasi
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {displayedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={handleOpen}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
