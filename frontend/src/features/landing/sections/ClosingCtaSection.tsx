import { ArrowRight } from 'lucide-react';
import { CtaLink } from '../components/CtaLink';

export function ClosingCtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center text-white sm:px-10">
        <div
          className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative">
          <div
            className="mx-auto mb-4 h-1 w-12 rounded-full bg-gold"
            aria-hidden="true"
          />
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
            Mulai bangun kebiasaan finansial yang lebih sehat.
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            Coba aplikasi menggunakan akun demo dan jelajahi seluruh halaman
            SakuCampus. Tidak ada data nyata yang diperlukan.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaLink to="/register" variant="light">
              Daftar Sekarang
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CtaLink>
            <CtaLink to="/login" variant="outlineLight">
              Masuk dengan akun demo
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
