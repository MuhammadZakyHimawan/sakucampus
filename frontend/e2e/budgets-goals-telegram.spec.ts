import { expect, test } from '@playwright/test';

import { createBudget, createGoal, registerUser } from './helpers';

test('budget, goal contribution, notifications, and simulated Telegram', async ({
  page,
}) => {
  await registerUser(page, 'Mahasiswa Anggaran');

  await createBudget(page);
  await expect(page.getByText('Total Anggaran')).toBeVisible();
  await expect(page.getByText('Kebutuhan Primer').first()).toBeVisible();

  await createGoal(page);
  await expect(page.getByText('Dana Darurat').first()).toBeVisible();
  await page.getByRole('button', { name: 'Tambah Dana' }).first().click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nominal Kontribusi (Rp)').fill('50000');
  await dialog.getByRole('button', { name: 'Tambah Kontribusi' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Kontribusi ditambahkan')).toBeVisible();

  await page.goto('/notifications');
  await expect(
    page.getByRole('heading', { name: 'Notifikasi', exact: true }),
  ).toBeVisible();

  await page.goto('/settings/telegram');
  await page.getByRole('button', { name: 'Hubungkan Telegram' }).first().click();
  await expect(page.getByText(/Bot Telegram belum dikonfigurasi/)).toBeVisible();
});
