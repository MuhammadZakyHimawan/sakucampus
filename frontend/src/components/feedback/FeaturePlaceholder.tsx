import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export function FeaturePlaceholder({
  title,
  description,
  icon,
  features,
}: FeaturePlaceholderProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />

      <Card>
        <EmptyState
          icon={icon}
          title="Halaman sedang disiapkan"
          description="Fitur ini akan tersedia pada fase pengembangan berikutnya."
        />
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-ink">Yang akan tersedia</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm text-ink-secondary"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
