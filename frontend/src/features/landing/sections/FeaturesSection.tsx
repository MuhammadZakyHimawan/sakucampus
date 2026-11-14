import { Card, CardContent } from '@/components/ui/Card';
import { features } from '../content';

export function FeaturesSection() {
  return (
    <section
      id="fitur"
      className="border-y border-border bg-surface"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Fitur utama
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary sm:text-base">
            Semua yang kamu butuhkan untuk mencatat dan memahami keuangan
            sehari-hari dalam satu tempat.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardContent className="flex h-full flex-col gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
