import {
  BellRing,
  Check,
  PiggyBank,
  Send,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import type {
  AppNotification,
  NotificationSeverity,
  NotificationType,
} from '@/types';
import { formatDate } from '@/utils/date';

const NOTIFICATION_VISUALS: Record<
  NotificationType,
  { icon: LucideIcon; container: string }
> = {
  budget: {
    icon: PiggyBank,
    container: 'bg-warning/10 text-warning',
  },
  balance: {
    icon: Wallet,
    container: 'bg-info/10 text-info',
  },
  goal: {
    icon: Target,
    container: 'bg-success/10 text-success',
  },
  info: {
    icon: BellRing,
    container: 'bg-primary-light text-primary-dark',
  },
};

const SEVERITY_BADGE: Record<
  NotificationSeverity,
  { label: string; variant: 'neutral' | 'warning' | 'danger' }
> = {
  normal: { label: 'Normal', variant: 'neutral' },
  warning: { label: 'Waspada', variant: 'warning' },
  critical: { label: 'Kritis', variant: 'danger' },
};

export interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onMarkRead: (notification: AppNotification) => void;
  onDelete: (notification: AppNotification) => void;
}

export function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  const visual = NOTIFICATION_VISUALS[notification.type];
  const Icon = visual.icon;
  const severityMeta = notification.severity
    ? SEVERITY_BADGE[notification.severity]
    : null;

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-4 sm:flex-row sm:items-start',
        !notification.read && 'border-primary/40 bg-primary-light/20',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          visual.container,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{notification.title}</p>
          {!notification.read ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Baru
            </span>
          ) : null}
          {severityMeta ? (
            <Badge variant={severityMeta.variant}>{severityMeta.label}</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          {notification.message}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
          <span>{formatDate(notification.date)}</span>
          {notification.sentToTelegram ? (
            <span className="inline-flex items-center gap-1 text-info">
              <Send className="h-3 w-3" aria-hidden="true" />
              Terkirim ke Telegram
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {notification.link ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpen(notification)}
            >
              Buka
            </Button>
          ) : null}
          {!notification.read ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMarkRead(notification)}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Tandai dibaca
            </Button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDelete(notification)}
        className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-lg text-ink-secondary transition-colors hover:bg-danger/10 hover:text-danger sm:self-start"
        aria-label={`Hapus notifikasi ${notification.title}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </Card>
  );
}
