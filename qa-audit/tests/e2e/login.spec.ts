import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const accounts = JSON.parse(readFileSync('.auth/accounts.json', 'utf8')) as Record<string, { email: string; password: string }>;

test('[SCRUM-20] login: pilih peran dulu, lalu email dan kata sandi @smoke', async ({ page }) => {
  const account = accounts['data-steward']!;
  await page.goto('login');
  const email = page.getByLabel('Email');
  await expect(page.getByRole('group', { name: 'Pilih peran' })).toBeVisible();
  await expect(email).toHaveCount(0);

  await page.getByText('Data Operasional', { exact: true }).click();
  await page.getByRole('button', { name: 'Lanjutkan sebagai Data Operasional' }).click();
  await expect(email).toBeVisible();

  await page.getByRole('button', { name: 'Ganti peran' }).click();
  await expect(page.getByRole('group', { name: 'Pilih peran' })).toBeVisible();
  await expect(email).toHaveCount(0);

  await page.getByRole('button', { name: 'Lanjutkan sebagai Data Operasional' }).click();
  await email.fill(account.email);
  await page.getByRole('textbox', { name: 'Kata sandi' }).fill(account.password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/overview$/);
});
