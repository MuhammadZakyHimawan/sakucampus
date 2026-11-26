import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { isMockApiEnabled } from '@/lib/config';
import { NO_INSIGHTS_MESSAGE } from '@/lib/constants';
import type { FinancialInsight, InsightTone } from '@/types';

export interface FinancialInsightsProps {
  insights: FinancialInsight[];
  className?: string;
}

const toneConfig: Record<
  InsightTone,
  { icon: LucideIcon; container: string; iconClass: string }
> = {
  positive: {
    icon: CheckCircle2,
    container: 'border-success/20 bg-success/5',
    iconClass: 'text-success',
  },
  warning: {
    icon: AlertTriangle,
    container: 'border-warning/20 bg-warning/5',
    iconClass: 'text-warning',
  },
  danger: {
    icon: XCircle,
    container: 'border-danger/20 bg-danger/5',
    iconClass: 'text-danger',
  },
  info: {
    icon: Info,
    container: 'border-info/20 bg-info/5',
    iconClass: 'text-info',
  },
};

export function FinancialInsights({
  insights,
  className,
}: FinancialInsightsProps) {
  const isMock = isMockApiEnabled();

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Insight & Rekomendasi</CardTitle>
          <CardDescription>
            {isMock
              ? 'Dihitung otomatis dari mock data demo.'
              : 'Evaluasi proaktif atas arus kas, anggaran, dan ketahanan saldomu.'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {insights.length > 0 ? (
          insights.map((insight) => {
            const config = toneConfig[insight.tone];
            const Icon = config.icon;

            return (
              <div
                key={insight.id}
                className={cn(
                  'flex gap-3 rounded-lg border p-3',
                  config.container,
                )}
              >
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    config.iconClass,
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-2 text-sm text-ink-secondary">
            {NO_INSIGHTS_MESSAGE}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
