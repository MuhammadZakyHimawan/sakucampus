import { STORAGE_KEYS } from '@/lib/config';
import type { Goal } from '@/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addGoalContribution,
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
} from './goals.service';

const goals: Goal[] = [
  {
    id: 'goal-late',
    name: 'Liburan',
    targetAmount: 2_000_000,
    savedAmount: 200_000,
    deadline: '2026-12-31',
  },
  {
    id: 'goal-early',
    name: 'Dana Darurat',
    targetAmount: 5_000_000,
    savedAmount: 1_000_000,
    deadline: '2026-06-30',
  },
];

async function resolve<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(300);
  return promise;
}

function readStoredGoals(): Goal[] {
  return JSON.parse(
    window.localStorage.getItem(STORAGE_KEYS.goals) ?? '[]',
  ) as Goal[];
}

describe('goals service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads goals sorted by nearest deadline', async () => {
    const result = await resolve(getGoals());

    expect(result.map((goal) => goal.id)).toEqual(['goal-early', 'goal-late']);
  });

  it('creates a trimmed goal with zero saved amount', async () => {
    const goal = await resolve(
      createGoal({
        name: '  Laptop  ',
        targetAmount: 8_000_000,
        deadline: '2026-09-01',
      }),
    );

    expect(goal.name).toBe('Laptop');
    expect(goal.savedAmount).toBe(0);
    expect(readStoredGoals()).toHaveLength(3);
  });

  it('updates a goal and adds contributions', async () => {
    const updated = await resolve(
      updateGoal('goal-early', {
        name: 'Dana Darurat Baru',
        targetAmount: 6_000_000,
        deadline: '2026-07-31',
      }),
    );
    const contributed = await resolve(
      addGoalContribution('goal-early', 500_000),
    );

    expect(updated.name).toBe('Dana Darurat Baru');
    expect(contributed.savedAmount).toBe(1_500_000);
    expect(readStoredGoals().find((goal) => goal.id === 'goal-early')).toMatchObject(
      {
        name: 'Dana Darurat Baru',
        savedAmount: 1_500_000,
      },
    );
  });

  it('rejects invalid input and missing goals', async () => {
    const invalidContribution = addGoalContribution('goal-early', 0);
    const contributionAssertion = expect(invalidContribution).rejects.toThrow(
      'Nominal kontribusi',
    );
    await vi.advanceTimersByTimeAsync(300);
    await contributionAssertion;

    const missingGoal = deleteGoal('goal-missing');
    const missingAssertion = expect(missingGoal).rejects.toThrow(
      'Target tabungan tidak ditemukan',
    );
    await vi.advanceTimersByTimeAsync(300);
    await missingAssertion;
  });
});
