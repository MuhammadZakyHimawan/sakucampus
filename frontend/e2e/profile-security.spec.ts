import { expect, test } from '@playwright/test';

import { loginUser, registerUser } from './helpers';

test('change password, revoke old session, and log in with new password', async ({
  page,
}) => {
  const email = await registerUser(page, 'Mahasiswa Keamanan');

  await page.goto('/settings/profile');
  await page.getByLabel('Password saat ini').fill('demo1234');
  await page.getByLabel('Password baru', { exact: true }).fill('demo5678');
  await page.getByLabel('Konfirmasi password baru').fill('demo5678');
  await page.getByRole('button', { name: 'Ubah Password' }).click();
  await expect(page.getByText('Password diperbarui')).toBeVisible();

  await page.getByRole('button', { name: 'Keluar Sekarang' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/login$/);

  await loginUser(page, email, 'demo5678');
  await expect(
    page
      .getByRole('navigation', { name: 'Navigasi aplikasi' })
      .getByRole('link', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
});
