import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { problems } from '../content';

export function ProblemSolutionSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Masalah kecil yang sering terasa besar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary sm:text-base">
          Mencatat keuangan tidak harus rumit. SakuCampus membantu memangkas
          hambatan yang paling sering membuat pencatatan berhenti di tengah
          jalan.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {problems.map((problem) => {
          const Icon = problem.icon;

          return (
            <Card key={problem.title}>
              <CardContent className="flex h-full flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-ink">
                      {problem.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                      {problem.description}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex items-start gap-2.5 rounded-lg bg-primary-light/70 px-3.5 py-3">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-relaxed text-primary-dark">
                    {problem.solution}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
