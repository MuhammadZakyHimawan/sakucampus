const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  return value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
}

export function toISODate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(toDate(value));
}

export function formatShortDate(value: string | Date): string {
  return shortDateFormatter.format(toDate(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(toDate(value));
}

export function daysInRange(start: string, end: string): number {
  const difference = toDate(end).getTime() - toDate(start).getTime();
  return Math.max(1, Math.floor(difference / 86_400_000) + 1);
}
