import { Card, CardContent } from '@/components/ui/Card';
import { APP_NAME, MOCK_API_ENABLED } from '@/lib/config';
import { aboutPoints } from '../content';

export function AboutSection() {
  return (
    <section
      id="tentang"
      className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tentang {APP_NAME}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-base">
            {APP_NAME} adalah sistem konsultan keuangan proaktif untuk
            mahasiswa. Website ini menjadi pusat visualisasi dan pengelolaan
            keuangan, sementara pencatatan sehari-hari dirancang agar bisa
            dilakukan melalui Telegram.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-base">
            Fokus kami sederhana: membuat pencatatan cukup ringan untuk
            dilakukan setiap hari, lalu mengubah catatan itu menjadi keputusan
            yang lebih baik.
          </p>
          <p className="mt-4 rounded-lg bg-info/10 px-3.5 py-3 text-xs leading-relaxed text-info">
            {MOCK_API_ENABLED
              ? 'Kamu sedang melihat mode demo dengan data contoh. Aktifkan mode backend untuk menyimpan data sungguhan.'
              : 'Data tersinkron dengan backend. Analisis proaktif berbasis rule engine sedang dikembangkan bertahap.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {aboutPoints.map((point) => {
            const Icon = point.icon;

            return (
              <Card key={point.title}>
                <CardContent className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      {point.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                      {point.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
