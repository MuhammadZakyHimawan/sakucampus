import { LogOut, Wallet, X } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { APP_NAME } from '@/lib/config';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth-context';
import { useLogout } from '@/features/auth/useLogout';
import { navGroups } from '@/lib/navigation';
import { getInitials } from '@/utils/text';

export interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const { user } = useAuth();
  const logout = useLogout();
  const location = useLocation();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl"
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
          <span className="flex items-center gap-2 text-lg font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            {APP_NAME}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-background hover:text-ink"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Navigasi aplikasi mobile"
        >
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'relative bg-primary-light text-primary-dark before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-gold'
                            : 'text-ink-secondary hover:bg-background hover:text-ink',
                        )
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-background px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {getInitials(user?.name ?? 'Pengguna Demo')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {user?.name ?? 'Pengguna Demo'}
              </p>
              <p className="truncate text-xs text-ink-secondary">
                Mode demo · data contoh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
