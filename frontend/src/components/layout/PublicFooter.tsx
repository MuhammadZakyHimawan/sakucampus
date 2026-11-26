import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_DESCRIPTION, APP_NAME, MOCK_API_ENABLED } from '@/lib/config';
import { publicNavItems } from '@/lib/navigation';

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            {APP_DESCRIPTION}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 text-sm">
          <div>
            <p className="font-semibold text-ink">Navigasi</p>
            <ul className="mt-3 flex flex-col gap-2">
              {publicNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="text-ink-secondary transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-ink">Akun</p>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <Link
                  to="/login"
                  className="text-ink-secondary transition-colors hover:text-primary"
                >
                  Masuk
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-ink-secondary transition-colors hover:text-primary"
                >
                  Daftar
                </Link>
              </li>
              <li>
                <Link
                  to="/forgot-password"
                  className="text-ink-secondary transition-colors hover:text-primary"
                >
                  Lupa Password
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 text-center text-xs text-ink-secondary">
        © {new Date().getFullYear()} {APP_NAME}.{' '}
        {MOCK_API_ENABLED
          ? 'Aplikasi ini menampilkan data demo.'
          : 'Data akun tersinkron dengan backend.'}
      </div>
    </footer>
  );
}
