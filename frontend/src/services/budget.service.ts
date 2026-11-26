import { EXPENSE_CATEGORIES } from '@/lib/categories';
import { isMockApiEnabled } from '@/lib/config';
import type { Budget, BudgetInput, ExpenseCategory } from '@/types';
import { apiRequest } from './api-client';
import { createId, loadDataset, saveDataset } from './data-store';

const MOCK_DELAY = 300;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function validateBudgetInput(input: BudgetInput): void {
  if (!EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory)) {
    throw new Error('Kategori anggaran wajib dipilih.');
  }

  if (!Number.isInteger(input.limit) || input.limit <= 0) {
    throw new Error(
      'Batas anggaran harus berupa angka bulat lebih besar dari nol.',
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.periodStart) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.periodEnd)
  ) {
    throw new Error('Periode anggaran tidak valid.');
  }

  if (input.periodEnd < input.periodStart) {
    throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  }
}

export async function getBudgets(): Promise<Budget[]> {
  if (!isMockApiEnabled()) {
    return apiRequest<Budget[]>('/budgets');
  }

  await wait(MOCK_DELAY);

  return loadDataset().budgets;
}

export async function createBudget(input: BudgetInput): Promise<Budget> {
  validateBudgetInput(input);

  if (!isMockApiEnabled()) {
    return apiRequest<Budget>('/budgets', {
      method: 'POST',
      body: input,
    });
  }

  await wait(MOCK_DELAY);

  const dataset = loadDataset();

  if (
    dataset.budgets.some(
      (budget) =>
        budget.category === input.category &&
        budget.periodStart <= input.periodEnd &&
        budget.periodEnd >= input.periodStart,
    )
  ) {
    throw new Error(
      `Anggaran untuk kategori ${input.category} sudah ada pada periode ini. Perbarui anggaran yang sudah tersedia.`,
    );
  }

  const budget: Budget = { id: createId('budget'), ...input };
  const budgets = [...dataset.budgets, budget];

  saveDataset({ ...dataset, budgets });

  return budget;
}

export async function updateBudget(
  id: string,
  input: BudgetInput,
): Promise<Budget> {
  validateBudgetInput(input);

  if (!isMockApiEnabled()) {
    return apiRequest<Budget>(`/budgets/${id}`, {
      method: 'PATCH',
      body: input,
    });
  }

  await wait(MOCK_DELAY);

  const dataset = loadDataset();
  const index = dataset.budgets.findIndex((budget) => budget.id === id);

  if (index === -1) {
    throw new Error('Anggaran tidak ditemukan.');
  }

  const hasOverlap = dataset.budgets.some(
    (budget) =>
      budget.id !== id &&
      budget.category === input.category &&
      budget.periodStart <= input.periodEnd &&
      budget.periodEnd >= input.periodStart,
  );

  if (hasOverlap) {
    throw new Error(
      `Anggaran untuk kategori ${input.category} sudah ada pada periode ini.`,
    );
  }

  const updated: Budget = { ...dataset.budgets[index], ...input };
  const budgets = [...dataset.budgets];
  budgets[index] = updated;

  saveDataset({ ...dataset, budgets });

  return updated;
}

export async function deleteBudget(id: string): Promise<void> {
  if (!isMockApiEnabled()) {
    await apiRequest<void>(`/budgets/${id}`, { method: 'DELETE' });
    return;
  }

  await wait(MOCK_DELAY);

  const dataset = loadDataset();
  const budgets = dataset.budgets.filter((budget) => budget.id !== id);

  if (budgets.length === dataset.budgets.length) {
    throw new Error('Anggaran tidak ditemukan.');
  }

  saveDataset({ ...dataset, budgets });
}
