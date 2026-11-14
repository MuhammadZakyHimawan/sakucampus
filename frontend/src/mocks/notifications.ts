import type { AppNotification } from '@/types';
import { toISODate } from '@/utils/date';

const today = new Date();

function daysAgo(days: number): string {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

export const mockNotifications: AppNotification[] = [
  {
    id: 'notification-001',
    type: 'budget',
    title: 'Anggaran Transportasi terlampaui',
    message:
      'Pengeluaran transportasi sudah melewati batas bulan ini. Coba alokasikan ulang pengeluaran berikutnya agar tetap nyaman.',
    date: daysAgo(0),
    read: false,
    link: '/budgets',
  },
  {
    id: 'notification-002',
    type: 'budget',
    title: 'Gaya Hidup hampir mencapai batas',
    message:
      'Sisa anggaran Gaya Hidup tinggal sedikit. Pertimbangkan menunda pengeluaran non-prioritas sampai awal bulan berikutnya.',
    date: daysAgo(1),
    read: false,
    link: '/budgets',
  },
  {
    id: 'notification-003',
    type: 'goal',
    title: 'Target Dana Darurat berkembang',
    message:
      'Kamu sudah menyisihkan 42% dari target Dana Darurat. Sedikit demi sedikit, kebiasaan ini akan terasa hasilnya.',
    date: daysAgo(2),
    read: false,
    link: '/goals',
  },
  {
    id: 'notification-004',
    type: 'balance',
    title: 'Saldo masih berada di atas batas minimum',
    message:
      'Saldo kamu masih aman. Tetap pantau pengeluaran harian agar tidak turun di bawah batas minimum yang kamu tetapkan.',
    date: daysAgo(3),
    read: true,
    link: '/settings/finance',
  },
  {
    id: 'notification-005',
    type: 'info',
    title: 'Catat transaksi lebih cepat lewat Telegram',
    message:
      'Hubungkan Telegram untuk mencatat pengeluaran hanya dengan mengirim pesan. Fitur ini masih berupa simulasi pada versi demo.',
    date: daysAgo(4),
    read: true,
    link: '/settings/telegram',
  },
  {
    id: 'notification-006',
    type: 'goal',
    title: 'Target Liburan Semester tercapai',
    message:
      'Selamat! Target Liburan Semester sudah terkumpul penuh. Kamu bisa membuat target baru untuk tujuan berikutnya.',
    date: daysAgo(5),
    read: true,
    link: '/goals',
  },
];
