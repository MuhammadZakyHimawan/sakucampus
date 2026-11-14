import { Card } from '@/components/ui/Card';
import { steps } from '../content';

export function HowItWorksSection() {
  return (
    <section
      id="cara-kerja"
      className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Cara kerja
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary sm:text-base">
          Empat langkah sederhana untuk mulai mencatat keuangan tanpa ribet.
        </p>
      </div>

      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <li key={step.title}>
              <Card className="h-full p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink">
                    {index + 1}
                  </span>
                  <Icon
                    className="h-5 w-5 text-ink-secondary"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                  {step.description}
                </p>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
