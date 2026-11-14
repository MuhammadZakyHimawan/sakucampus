import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  LayoutDashboard,
  MessageCircle,
  NotebookPen,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface LandingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface LandingStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface LandingProblem {
  icon: LucideIcon;
  title: string;
  description: string;
  solution: string;
}

export const features: LandingFeature[] = [
  {
    icon: MessageCircle,
    title: 'Catat lewat Telegram',
    description:
      'Ketik transaksi sehari-hari dengan bahasa alami, tanpa membuka aplikasi.',
  },
  {
    icon: Sparkles,
    title: 'Klasifikasi otomatis',
    description:
      'Sistem mengenali nominal dan kategori transaksi dari pesan yang kamu kirim.',
  },
  {
    icon: Wallet,
    title: 'Pantau anggaran',
    description:
      'Lihat sisa anggaran per kategori sebelum pengeluaranmu melewati batas.',
  },
  {
    icon: BarChart3,
    title: 'Insight keuangan',
    description:
      'Pahami pola pemasukan dan pengeluaran melalui ringkasan yang mudah dibaca.',
  },
  {
    icon: Target,
    title: 'Target tabungan',
    description:
      'Tetapkan target dan pantau perkembangan tabunganmu dari waktu ke waktu.',
  },
];

export const steps: LandingStep[] = [
  {
    icon: Send,
    title: 'Hubungkan Telegram',
    description: 'Aktifkan akun Telegram dari halaman pengaturan.',
  },
  {
    icon: MessageCircle,
    title: 'Kirim pesan transaksi',
    description: 'Contoh: "makan ayam 20rb" atau "uang saku 500rb".',
  },
  {
    icon: Sparkles,
    title: 'Sistem memahami transaksi',
    description: 'Nominal dan kategori transaksi dikenali secara otomatis.',
  },
  {
    icon: LayoutDashboard,
    title: 'Pantau hasilnya',
    description: 'Buka dashboard untuk melihat kondisi keuanganmu.',
  },
];

export const problems: LandingProblem[] = [
  {
    icon: NotebookPen,
    title: 'Malas mencatat',
    description:
      'Membuka aplikasi dan mengisi formulir setiap kali ada pengeluaran terasa merepotkan.',
    solution:
      'Cukup kirim pesan singkat ke Telegram. Pencatatan berjalan tanpa formulir panjang.',
  },
  {
    icon: TrendingDown,
    title: 'Uang habis tanpa sadar',
    description:
      'Pengeluaran kecil menumpuk dan baru terasa ketika saldo sudah menipis di akhir bulan.',
    solution:
      'Peringatan anggaran muncul sebelum batas kategori terlampaui, bukan setelahnya.',
  },
  {
    icon: CalendarClock,
    title: 'Sulit melihat gambaran besar',
    description:
      'Catatan tersebar di banyak tempat dan sulit diubah menjadi keputusan keuangan.',
    solution:
      'Dashboard merangkum saldo, arus kas, dan target tabungan dalam satu tampilan.',
  },
];

export const previewData = {
  initialBalance: 1_000_000,
  income: 2_500_000,
  expense: 1_180_000,
  balance: 2_320_000,
  netCashFlow: 1_320_000,
  categories: [
    { label: 'Kebutuhan Primer', amount: 420_000 },
    { label: 'Gaya Hidup', amount: 400_000 },
    { label: 'Transportasi', amount: 180_000 },
    { label: 'Pendidikan', amount: 100_000 },
    { label: 'Tagihan', amount: 80_000 },
  ],
  budgets: [
    {
      label: 'Kebutuhan Primer',
      used: 420_000,
      limit: 1_000_000,
      tone: 'success' as const,
    },
    {
      label: 'Gaya Hidup',
      used: 400_000,
      limit: 500_000,
      tone: 'warning' as const,
    },
  ],
  transactions: [
    {
      description: 'Uang saku bulanan',
      category: 'Uang Saku',
      amount: 2_500_000,
      type: 'income' as const,
    },
    {
      description: 'Makan ayam geprek',
      category: 'Kebutuhan Primer',
      amount: 20_000,
      type: 'expense' as const,
    },
    {
      description: 'Kopi susu',
      category: 'Gaya Hidup',
      amount: 15_000,
      type: 'expense' as const,
    },
  ],
} as const;

export const telegramMessages = [
  {
    from: 'user' as const,
    text: 'makan ayam 20rb',
  },
  {
    from: 'bot' as const,
    text: 'Tercatat sebagai pengeluaran.',
    meta: 'Kebutuhan Primer · Rp20.000',
  },
  {
    from: 'user' as const,
    text: 'uang saku 500rb',
  },
  {
    from: 'bot' as const,
    text: 'Tercatat sebagai pemasukan.',
    meta: 'Uang Saku · Rp500.000',
  },
  {
    from: 'bot' as const,
    text: 'Anggaran Gaya Hidup tersisa Rp100.000. Hati-hati, ya.',
    meta: 'Pengingat anggaran',
  },
];

export const landingHighlights = [
  'Pencatatan lewat chat',
  'Ringkasan otomatis',
  'Peringatan anggaran',
];

export const aboutPoints = [
  {
    icon: CheckCircle2,
    title: 'Proaktif',
    description:
      'Membantu kamu mengambil keputusan sebelum masalah keuangan terjadi.',
  },
  {
    icon: MessageCircle,
    title: 'Sederhana',
    description:
      'Pencatatan dirancang seringan mengirim pesan sehari-hari.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparan',
    description:
      'Semua data pada versi demo diberi label jelas agar tidak menyesatkan.',
  },
];
