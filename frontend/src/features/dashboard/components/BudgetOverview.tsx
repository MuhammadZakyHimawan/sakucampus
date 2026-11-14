import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { BudgetProgress } from '@/components/ui/BudgetProgress';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';
import { NO_BUDGETS_MESSAGE } from '@/lib/constants';
import type { BudgetOverviewItem } from '@/types';

export interface BudgetOverviewProps {
  items: BudgetOverviewItem[];
  className?: string;
}

export function BudgetOverview({ items, className }: BudgetOverviewProps) {
  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>Pemakaian anggaran bulan ini.</CardDescription>
        </div>
        <Link
          to="/budgets"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Lihat semua
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {items.length > 0 ? (
          items.map((item) => (
            <BudgetProgress key={item.budget.id} item={item} />
          ))
        ) : (
          <EmptyState
            icon={Wallet}
            title="Belum ada anggaran"
            description={NO_BUDGETS_MESSAGE}
          />
        )}
      </CardContent>
    </Card>
  );
}
