import { isMockApiEnabled, STORAGE_KEYS } from '@/lib/config';
import { mockGoals } from '@/mocks/goals';
import type { Goal, GoalInput } from '@/types';
import { apiRequest } from './api-client';
import { createId } from './data-store';
import { readJson, writeJson } from './local-storage';

const MOCK_DELAY = 300;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isGoalLike(value: unknown): value is Goal {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Goal>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.targetAmount === 'number' &&
    typeof candidate.savedAmount === 'number' &&
    typeof candidate.deadline === 'string'
  );
}

function isGoalList(value: unknown): value is Goal[] {
  return Array.isArray(value) && value.every(isGoalLike);
}

function createDefaultGoals(): Goal[] {
  return mockGoals.map((goal) => ({ ...goal }));
}

function loadGoals(): Goal[] {
  return readJson(STORAGE_KEYS.goals, isGoalList, createDefaultGoals);
}

function saveGoals(goals: Goal[]): void {
  writeJson(STORAGE_KEYS.goals, goals);
}

function validateGoalInput(input: GoalInput): void {
  if (!input.name.trim()) {
    throw new Error('Nama target wajib diisi.');
  }

  if (!Number.isInteger(input.targetAmount) || input.targetAmount <= 0) {
    throw new Error(
      'Nominal target harus berupa angka bulat lebih besar dari nol.',
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) {
    throw new Error('Deadline target tidak valid.');
  }
}

export async function getGoals(): Promise<Goal[]> {
  if (!isMockApiEnabled()) {
    return apiRequest<Goal[]>('/goals');
  }

  await wait(MOCK_DELAY);

  return [...loadGoals()].sort((first, second) =>
    first.deadline.localeCompare(second.deadline),
  );
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  validateGoalInput(input);

  if (!isMockApiEnabled()) {
    return apiRequest<Goal>('/goals', {
      method: 'POST',
      body: {
        name: input.name.trim(),
        targetAmount: input.targetAmount,
        deadline: input.deadline,
      },
    });
  }

  await wait(MOCK_DELAY);

  const goal: Goal = {
    id: createId('goal'),
    name: input.name.trim(),
    targetAmount: input.targetAmount,
    savedAmount: 0,
    deadline: input.deadline,
  };
  const goals = [...loadGoals(), goal];

  saveGoals(goals);

  return goal;
}

export async function updateGoal(
  id: string,
  input: GoalInput,
): Promise<Goal> {
  validateGoalInput(input);

  if (!isMockApiEnabled()) {
    return apiRequest<Goal>(`/goals/${id}`, {
      method: 'PATCH',
      body: {
        name: input.name.trim(),
        targetAmount: input.targetAmount,
        deadline: input.deadline,
      },
    });
  }

  await wait(MOCK_DELAY);

  const goals = loadGoals();
  const index = goals.findIndex((goal) => goal.id === id);

  if (index === -1) {
    throw new Error('Target tabungan tidak ditemukan.');
  }

  const updated: Goal = {
    ...goals[index],
    name: input.name.trim(),
    targetAmount: input.targetAmount,
    deadline: input.deadline,
  };
  const nextGoals = [...goals];
  nextGoals[index] = updated;

  saveGoals(nextGoals);

  return updated;
}

export async function addGoalContribution(
  id: string,
  amount: number,
  note?: string,
): Promise<Goal> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      'Nominal kontribusi harus berupa angka bulat lebih besar dari nol.',
    );
  }

  if (!isMockApiEnabled()) {
    return apiRequest<Goal>(`/goals/${id}/contributions`, {
      method: 'POST',
      body: { amount, note: note?.trim() || null },
    });
  }

  await wait(MOCK_DELAY);

  const goals = loadGoals();
  const index = goals.findIndex((goal) => goal.id === id);

  if (index === -1) {
    throw new Error('Target tabungan tidak ditemukan.');
  }

  const updated: Goal = {
    ...goals[index],
    savedAmount: goals[index].savedAmount + amount,
  };
  const nextGoals = [...goals];
  nextGoals[index] = updated;

  saveGoals(nextGoals);

  return updated;
}

export async function deleteGoal(id: string): Promise<void> {
  if (!isMockApiEnabled()) {
    await apiRequest<void>(`/goals/${id}`, { method: 'DELETE' });
    return;
  }

  await wait(MOCK_DELAY);

  const goals = loadGoals();
  const nextGoals = goals.filter((goal) => goal.id !== id);

  if (nextGoals.length === goals.length) {
    throw new Error('Target tabungan tidak ditemukan.');
  }

  saveGoals(nextGoals);
}
