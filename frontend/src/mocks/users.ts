import type { User } from '@/types';

export const DEMO_CREDENTIALS = {
  email: 'andi@example.com',
  password: 'demo1234',
} as const;

export const DEMO_USER: User = {
  id: 'user-demo-001',
  name: 'Andi Pratama',
  email: 'andi@example.com',
  currency: 'IDR',
  initialBalance: 1_000_000,
  minBalance: 250_000,
};
