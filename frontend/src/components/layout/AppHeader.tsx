import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings2,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { useLogout } from '@/features/auth/useLogout';
import { useFinanceData } from '@/hooks/finance-data-context';
import { findNavLabel } from '@/lib/navigation';
import { formatDate } from '@/utils/date';
import { getInitials } from '@/utils/text';

const menuItemClasses =
  'flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-secondary transition-colors hover:bg-background hover:text-ink';

export function AppHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth();
  const { unreadNotificationCount } = useFinanceData();
  const logout = useLogout();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const title = findNavLabel(location.pathname);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-ink-secondary transition-colors hover:bg-background hover:text-ink lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className="truncate text-xs text-ink-secondary">
            {formatDate(new Date())}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border text-ink-secondary transition-colors hover:bg-background hover:text-ink"
            aria-label={
              unreadNotificationCount > 0
                ? `Lihat notifikasi (${unreadNotificationCount} belum dibaca)`
                : 'Lihat notifikasi'
            }
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadNotificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            ) : null}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="flex h-10 items-center gap-2 rounded-lg border border-border px-2 text-sm font-medium text-ink transition-colors hover:bg-background"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                {getInitials(user?.name ?? 'Pengguna')}
              </span>
              <span className="hidden max-w-32 truncate sm:block">
                {user?.name ?? 'Pengguna'}
              </span>
              <ChevronDown
                className="hidden h-4 w-4 text-ink-secondary sm:block"
                aria-hidden="true"
              />
            </button>

            {open ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface py-2 shadow-lg"
              >
                <div className="border-b border-border px-3 pb-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {user?.name ?? 'Pengguna'}
                  </p>
                  <p className="truncate text-xs text-ink-secondary">
                    {user?.email ?? ''}
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/settings/profile"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={menuItemClasses}
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    Profil
                  </Link>
                  <Link
                    to="/settings/finance"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={menuItemClasses}
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    Pengaturan Keuangan
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className={menuItemClasses}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Keluar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
