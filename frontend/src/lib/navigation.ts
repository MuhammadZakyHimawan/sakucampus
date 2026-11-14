import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  GraduationCap,
  LayoutDashboard,
  Send,
  Settings2,
  Target,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface PublicNavItem {
  label: string;
  href: string;
}

export const navGroups: NavGroup[] = [
  {
    label: 'Utama',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Transaksi', to: '/transactions', icon: ArrowLeftRight },
      { label: 'Anggaran', to: '/budgets', icon: Wallet },
      { label: 'Target Tabungan', to: '/goals', icon: Target },
      { label: 'Laporan', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Lainnya',
    items: [
      { label: 'Notifikasi', to: '/notifications', icon: Bell },
      { label: 'Edukasi', to: '/education', icon: GraduationCap },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { label: 'Profil', to: '/settings/profile', icon: User },
      { label: 'Telegram', to: '/settings/telegram', icon: Send },
      { label: 'Keuangan', to: '/settings/finance', icon: Settings2 },
    ],
  },
];

export const publicNavItems: PublicNavItem[] = [
  { label: 'Beranda', href: '/#beranda' },
  { label: 'Fitur', href: '/#fitur' },
  { label: 'Cara Kerja', href: '/#cara-kerja' },
  { label: 'Tentang', href: '/#tentang' },
];

export function findNavLabel(pathname: string): string {
  for (const group of navGroups) {
    const match = group.items.find(
      (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
    );

    if (match) {
      return match.label;
    }
  }

  return 'SakuCampus';
}
