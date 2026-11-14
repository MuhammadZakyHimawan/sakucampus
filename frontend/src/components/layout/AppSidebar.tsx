import { LogOut, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { APP_NAME } from '@/lib/config';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth-context';
import { useLogout } from '@/features/auth/useLogout';
import { navGroups } from '@/lib/navigation';
import { getInitials } from '@/utils/text';

export function AppSidebar() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-extrabold">{APP_NAME}</span>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Navigasi aplikasi"
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

      <div className="border-t border-border p-3">
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
    </aside>
  );
}
