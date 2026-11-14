import {
  CalendarDays,
  CheckCircle2,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Goal } from '@/types';
import {
  computeGoalProgress,
  isGoalAchieved,
} from '@/utils/calculations';
import { formatCurrency } from '@/utils/currency';
import { formatDate, toDate, toISODate } from '@/utils/date';

export interface GoalCardProps {
  goal: Goal;
  onContribute: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const progress = computeGoalProgress(goal);
  const achieved = isGoalAchieved(goal);
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const isOverdue = !achieved && goal.deadline < toISODate(new Date());
  const daysLeft = Math.ceil(
    (toDate(goal.deadline).getTime() - toDate(toISODate(new Date())).getTime()) /
      86_400_000,
  );

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
            {achieved ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Target className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{goal.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-secondary">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(goal.deadline)}
            </p>
          </div>
        </div>
        <Badge
          variant={achieved ? 'success' : isOverdue ? 'danger' : 'primary'}
        >
          {achieved ? 'Tercapai' : isOverdue ? 'Lewat deadline' : 'Aktif'}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <ProgressBar
          value={progress}
          tone={achieved ? 'success' : progress >= 70 ? 'primary' : 'warning'}
          label="Progres target"
          showValue
        />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className="min-w-0 break-words text-ink-secondary">
            Terkumpul{' '}
            <span className="font-semibold text-ink">
              {formatCurrency(goal.savedAmount)}
            </span>
          </span>
          <span className="min-w-0 break-words text-ink-secondary">
            Target{' '}
            <span className="font-semibold text-ink">
              {formatCurrency(goal.targetAmount)}
            </span>
          </span>
        </div>
      </div>

      <p className="text-xs text-ink-secondary">
        {achieved
          ? 'Target sudah terkumpul penuh. Kamu bisa membuat target baru untuk tujuan berikutnya.'
          : daysLeft >= 0
            ? `Sisa ${formatCurrency(remaining)} · ${daysLeft} hari lagi menuju deadline.`
            : `Sisa ${formatCurrency(remaining)} · deadline sudah terlewat.`}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onContribute(goal)}
          disabled={achieved}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Dana
        </Button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-primary-light hover:text-primary-dark"
            aria-label={`Edit target ${goal.name}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-danger/10 hover:text-danger"
            aria-label={`Hapus target ${goal.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  );
}
