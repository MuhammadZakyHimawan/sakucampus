import { MOCK_API_ENABLED, STORAGE_KEYS } from '@/lib/config';
import { mockNotifications } from '@/mocks/notifications';
import type { AppNotification } from '@/types';
import { apiRequest } from './api-client';
import { readJson, writeJson } from './local-storage';

const MOCK_DELAY = 300;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isNotificationLike(value: unknown): value is AppNotification {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<AppNotification>;

  return (
    typeof candidate.id === 'string' &&
    (candidate.type === 'budget' ||
      candidate.type === 'balance' ||
      candidate.type === 'goal' ||
      candidate.type === 'info') &&
    typeof candidate.title === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.read === 'boolean' &&
    (candidate.link === undefined || typeof candidate.link === 'string')
  );
}

function isNotificationList(value: unknown): value is AppNotification[] {
  return Array.isArray(value) && value.every(isNotificationLike);
}

function createDefaultNotifications(): AppNotification[] {
  return mockNotifications.map((notification) => ({ ...notification }));
}

function loadNotifications(): AppNotification[] {
  return readJson(
    STORAGE_KEYS.notifications,
    isNotificationList,
    createDefaultNotifications,
  );
}

function saveNotifications(notifications: AppNotification[]): void {
  writeJson(STORAGE_KEYS.notifications, notifications);
}

function sortNotifications(
  notifications: AppNotification[],
): AppNotification[] {
  return [...notifications].sort((first, second) =>
    second.date.localeCompare(first.date),
  );
}

export async function getNotifications(): Promise<AppNotification[]> {
  if (!MOCK_API_ENABLED) {
    return apiRequest<AppNotification[]>('/notifications');
  }

  await wait(MOCK_DELAY);

  return sortNotifications(loadNotifications());
}

export async function markNotificationRead(
  id: string,
): Promise<AppNotification> {
  if (!MOCK_API_ENABLED) {
    return apiRequest<AppNotification>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  await wait(MOCK_DELAY);

  const notifications = loadNotifications();
  const index = notifications.findIndex(
    (notification) => notification.id === id,
  );

  if (index === -1) {
    throw new Error('Notifikasi tidak ditemukan.');
  }

  const updated: AppNotification = {
    ...notifications[index],
    read: true,
  };
  const nextNotifications = [...notifications];
  nextNotifications[index] = updated;

  saveNotifications(nextNotifications);

  return updated;
}

export async function markAllNotificationsRead(): Promise<void> {
  if (!MOCK_API_ENABLED) {
    await apiRequest<{ updated: number }>('/notifications/read-all', {
      method: 'PATCH',
    });

    return;
  }

  await wait(MOCK_DELAY);

  const notifications = loadNotifications().map((notification) => ({
    ...notification,
    read: true,
  }));

  saveNotifications(notifications);
}

export async function deleteNotification(id: string): Promise<void> {
  if (!MOCK_API_ENABLED) {
    await apiRequest<void>(`/notifications/${id}`, { method: 'DELETE' });
    return;
  }

  await wait(MOCK_DELAY);

  const notifications = loadNotifications();
  const nextNotifications = notifications.filter(
    (notification) => notification.id !== id,
  );

  if (nextNotifications.length === notifications.length) {
    throw new Error('Notifikasi tidak ditemukan.');
  }

  saveNotifications(nextNotifications);
}
