import { Menu, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '@/lib/config';
import { publicNavItems } from '@/lib/navigation';

const primaryLinkClasses =
  'inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark';
const outlineLinkClasses =
  'inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary';

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-extrabold"
          aria-label={`${APP_NAME} beranda`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>{APP_NAME}</span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navigasi publik"
        >
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-background hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className={outlineLinkClasses}>
            Masuk
          </Link>
          <Link to="/register" className={primaryLinkClasses}>
            Daftar Sekarang
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-ink-secondary transition-colors hover:bg-background hover:text-ink md:hidden"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          aria-controls="public-mobile-menu"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {open ? (
        <div
          id="public-mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Navigasi publik mobile">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-background hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className={outlineLinkClasses}
            >
              Masuk
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className={primaryLinkClasses}
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
