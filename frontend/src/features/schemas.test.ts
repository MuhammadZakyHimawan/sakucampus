import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from './auth/schemas';
import { budgetSchema } from './budgets/schemas';
import { financeSettingsSchema } from './finance/schemas';
import { contributionSchema, goalSchema } from './goals/schemas';
import { transactionSchema } from './transactions/schemas';

function issuePaths(result: {
  success: boolean;
  error?: { issues: { path: (string | number)[] }[] };
}): string[] {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('form schemas', () => {
  it('validates login and forgot password input', () => {
    expect(
      loginSchema.safeParse({
        email: 'andi@example.com',
        password: 'demo1234',
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: 'not-an-email', password: '' }).success,
    ).toBe(false);
    expect(
      forgotPasswordSchema.safeParse({ email: 'andi@example.com' }).success,
    ).toBe(true);
  });

  it('validates registration and reports mismatched fields', () => {
    expect(
      registerSchema.safeParse({
        name: 'Budi Santoso',
        email: 'budi@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        terms: true,
      }).success,
    ).toBe(true);

    const invalid = registerSchema.safeParse({
      name: 'B',
      email: 'budi@example.com',
      password: 'password123',
      confirmPassword: 'different123',
      terms: false,
    });

    expect(invalid.success).toBe(false);
    expect(issuePaths(invalid)).toEqual(
      expect.arrayContaining(['name', 'confirmPassword', 'terms']),
    );
  });

  it('validates transaction amount and category compatibility', () => {
    const valid = transactionSchema.safeParse({
      description: 'Makan siang',
      amount: '25000',
      type: 'expense',
      category: 'Kebutuhan Primer',
      date: '2026-05-01',
      source: 'manual',
    });
    const invalid = transactionSchema.safeParse({
      description: 'Uang saku',
      amount: '10.5',
      type: 'income',
      category: 'Gaya Hidup',
      date: '2026-05-01',
      source: 'manual',
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
    expect(issuePaths(invalid)).toEqual(
      expect.arrayContaining(['amount', 'category']),
    );
  });

  it('validates finance settings and budget period order', () => {
    expect(
      financeSettingsSchema.safeParse({
        initialBalance: '1000000',
        minBalance: '250000',
        period: 'month',
        notifyBudget: true,
        notifyBalance: true,
        notifyGoal: true,
      }).success,
    ).toBe(true);
    expect(
      financeSettingsSchema.safeParse({
        initialBalance: '-1',
        minBalance: '250000',
        period: 'month',
        notifyBudget: true,
        notifyBalance: true,
        notifyGoal: true,
      }).success,
    ).toBe(false);

    const invalidBudget = budgetSchema.safeParse({
      category: 'Gaya Hidup',
      limit: '300000',
      periodStart: '2026-05-31',
      periodEnd: '2026-05-01',
    });

    expect(invalidBudget.success).toBe(false);
    expect(issuePaths(invalidBudget)).toContain('periodEnd');
  });

  it('validates goal and contribution amounts', () => {
    expect(
      goalSchema.safeParse({
        name: 'Dana Darurat',
        targetAmount: '5000000',
        deadline: '2026-12-31',
      }).success,
    ).toBe(true);
    expect(
      goalSchema.safeParse({
        name: 'Dana Darurat',
        targetAmount: '0',
        deadline: '2026-12-31',
      }).success,
    ).toBe(false);
    expect(contributionSchema.safeParse({ amount: '100000' }).success).toBe(
      true,
    );
    expect(contributionSchema.safeParse({ amount: '-100' }).success).toBe(
      false,
    );
  });
});
