import { expect, type Page } from '@playwright/test';

export function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@kampus.ac.id`;
}

export async function registerUser(
  page: Page,
  name = 'Mahasiswa UAT',
  password = 'demo1234',
): Promise<string> {
  const email = uniqueEmail('uat');
  await page.goto('/register');
  await page.getByLabel('Nama lengkap').fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Konfirmasi password').fill(password);
  await page.getByLabel(/Saya menyetujui syarat/).check();
  await page.getByRole('button', { name: 'Daftar', exact: true }).click();
  await expect(
    page
      .getByRole('navigation', { name: 'Navigasi aplikasi' })
      .getByRole('link', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  return email;
}

export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(
    page
      .getByRole('navigation', { name: 'Navigasi aplikasi' })
      .getByRole('link', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
}

export async function createTransaction(
  page: Page,
  description: string,
  amount: string,
): Promise<void> {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Tambah Transaksi' }).first().click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Deskripsi').fill(description);
  await dialog.getByLabel('Nominal (Rp)').fill(amount);
  await dialog.getByLabel('Tanggal').fill(isoDate());
  await dialog.getByLabel('Jenis Transaksi').selectOption('expense');
  await dialog.getByLabel('Kategori').selectOption('Kebutuhan Primer');
  await dialog.getByLabel('Sumber Transaksi').selectOption('manual');
  await dialog.getByRole('button', { name: 'Tambah Transaksi' }).click();
  await expect(dialog).toBeHidden();
}

export async function createBudget(page: Page): Promise<void> {
  await page.goto('/budgets');
  await page.getByRole('button', { name: 'Tambah Anggaran' }).first().click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Kategori Pengeluaran').selectOption('Kebutuhan Primer');
  await dialog.getByLabel('Batas Anggaran (Rp)').fill('500000');
  await dialog.getByLabel('Periode Mulai').fill(isoDate());
  await dialog.getByLabel('Periode Selesai').fill(isoDate(30));
  await dialog.getByRole('button', { name: 'Tambah Anggaran' }).click();
  await expect(dialog).toBeHidden();
}

export async function createGoal(page: Page): Promise<void> {
  await page.goto('/goals');
  await page.getByRole('button', { name: 'Tambah Target' }).first().click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nama Target').fill('Dana Darurat');
  await dialog.getByLabel('Nominal Target (Rp)').fill('500000');
  await dialog.getByLabel('Deadline').fill(isoDate(30));
  await dialog.getByRole('button', { name: 'Buat Target' }).click();
  await expect(dialog).toBeHidden();
}
