import type { PeriodPreset } from '@/types';

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
  { value: 'month', label: 'Bulan ini' },
];

export const DEFAULT_DASHBOARD_PERIOD: PeriodPreset = '30d';

export const NO_TRANSACTIONS_MESSAGE =
  'Belum ada transaksi. Mulai catat pengeluaran pertamamu melalui Telegram atau website.';

export const NO_EXPENSE_MESSAGE =
  'Belum ada pengeluaran pada periode ini. Grafik kategori akan muncul setelah ada transaksi pengeluaran.';

export const NO_BUDGETS_MESSAGE =
  'Belum ada anggaran. Tambahkan anggaran pertamamu untuk mulai memantau pengeluaran.';

export const NO_INSIGHTS_MESSAGE =
  'Insight akan muncul setelah ada transaksi pada periode ini.';

export const NO_GOALS_MESSAGE =
  'Belum ada target tabungan. Buat target pertamamu untuk mulai menyisihkan dana secara terarah.';

export const NO_NOTIFICATIONS_MESSAGE =
  'Belum ada notifikasi. Peringatan dan informasi keuangan akan muncul di sini.';

export const NO_UNREAD_NOTIFICATIONS_MESSAGE =
  'Semua notifikasi sudah dibaca. Kamu bisa kembali ke tab Semua untuk melihat riwayat.';

export const NO_REPORTS_MESSAGE =
  'Belum ada transaksi pada periode ini. Laporan akan muncul setelah kamu mulai mencatat transaksi.';
