import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CtaLink } from '../components/CtaLink';
import { MiniDashboardPreview } from '../components/MiniDashboardPreview';

const previewPoints = [
  'Saldo dan arus kas bulan ini',
  'Anggaran per kategori dengan status aman atau peringatan',
  'Transaksi terbaru dari catatan manual maupun simulasi Telegram',
];

export function DashboardPreviewSection() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:px-8">
        <div>
          <Badge variant="primary">Pratinjau dashboard</Badge>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Satu layar untuk melihat kondisi keuanganmu.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary sm:text-base">
            Dashboard menyatukan informasi yang penting tanpa membuatmu
            tenggelam dalam angka. Fokus pada apa yang perlu diputuskan.
          </p>

          <ul className="mt-5 flex flex-col gap-2.5">
            {previewPoints.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 text-sm text-ink-secondary"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <CtaLink to="/login">Coba akun demo</CtaLink>
            <CtaLink to="/#cara-kerja" variant="outline">
              Pelajari cara kerja
            </CtaLink>
          </div>
        </div>

        <div className="min-w-0">
          <MiniDashboardPreview />
        </div>
      </div>
    </section>
  );
}
