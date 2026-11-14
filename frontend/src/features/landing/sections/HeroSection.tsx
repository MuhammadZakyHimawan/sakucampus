import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { APP_NAME } from '@/lib/config';
import { CtaLink } from '../components/CtaLink';
import { TelegramChatPreview } from '../components/TelegramChatPreview';
import { landingHighlights } from '../content';

export function HeroSection() {
  return (
    <section
      id="beranda"
      className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-light/60 to-background"
    >
      <div
        className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start gap-5">
          <Badge variant="primary" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
            Website demo · data contoh
          </Badge>

          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Atur Uang Saku,{' '}
            <span className="text-primary">Tanpa Ribet.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg">
            Catat pengeluaran cukup lewat chat Telegram. Pantau kondisi keuangan
            dan bangun kebiasaan finansial yang lebih sehat bersama {APP_NAME}.
          </p>

          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {landingHighlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-center gap-1.5 text-sm text-ink-secondary"
              >
                <Check
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                {highlight}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <CtaLink to="/register" size="lg">
              Mulai Sekarang
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CtaLink>
            <CtaLink to="/#cara-kerja" variant="outline" size="lg">
              Lihat Cara Kerja
            </CtaLink>
          </div>

          <p className="text-sm text-ink-secondary">
            Sudah punya akun?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary hover:underline"
            >
              Masuk di sini
            </Link>
            .
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -right-3 -top-3 z-10 hidden items-center gap-1.5 rounded-full border border-gold/40 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-soft sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
            Tanpa formulir panjang
          </div>
          <TelegramChatPreview />
        </div>
      </div>
    </section>
  );
}
