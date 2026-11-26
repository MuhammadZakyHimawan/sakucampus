import { expect, test } from '@playwright/test';

import { createTransaction, registerUser } from './helpers';

test('register, create transaction, and logout through the real backend', async ({
  page,
}) => {
  const email = await registerUser(page);
  expect(email).toContain('@kampus.ac.id');
  await expect(page.getByRole('heading', { name: /Halo, Mahasiswa/ })).toBeVisible();
  await expect(page.getByText('Tersinkron').first()).toBeVisible();

  await createTransaction(page, 'Makan ayam geprek', '25000');
  await expect(page.getByText('Makan ayam geprek').first()).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Halo, Mahasiswa/ })).toBeVisible();
  await expect(page.getByText('Pengeluaran', { exact: true }).first()).toBeVisible();

  await page.goto('/settings/profile');
  await page.getByRole('button', { name: 'Keluar Sekarang' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
