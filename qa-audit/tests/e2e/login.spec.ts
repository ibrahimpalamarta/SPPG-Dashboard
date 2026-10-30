import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const accounts = JSON.parse(readFileSync('.auth/accounts.json', 'utf8')) as Record<string, { email: string; password: string }>;

test('[SCRUM-20] login: email dan kata sandi langsung, peran dari akun @smoke', async ({ page }) => {
  const account = accounts['data-operasional-skn']!;
  await page.goto('login');
  await expect(page.getByRole('group', { name: 'Pilih peran' })).toHaveCount(0);
  await page.getByLabel('Email').fill(account.email);
  await page.getByRole('textbox', { name: 'Kata sandi' }).fill(account.password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/overview$/);
});
