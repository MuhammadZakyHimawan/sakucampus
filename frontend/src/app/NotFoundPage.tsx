import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

const primaryLinkClasses =
  'inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark';
const outlineLinkClasses =
  'inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary-dark">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-bold tracking-tight">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-md text-sm text-ink-secondary">
        Tautan yang kamu buka tidak tersedia atau sudah dipindahkan.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className={primaryLinkClasses}>
          Kembali ke beranda
        </Link>
        <Link to="/dashboard" className={outlineLinkClasses}>
          Buka dashboard
        </Link>
      </div>
    </main>
  );
}
