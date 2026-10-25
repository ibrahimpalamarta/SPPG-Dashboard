import { readFileSync } from 'node:fs';
import { expect, test as setup } from '@playwright/test';
import { ROLES, storageState } from './roles.js';

const accounts = JSON.parse(readFileSync('.auth/accounts.json', 'utf8')) as Record<string, { email: string; password: string }>;

// One real UI login per role; every test reuses the session via storageState.
for (const role of ROLES) {
  setup(`login ${role}`, async ({ page }) => {
    const account = accounts[role];
    if (!account) throw new Error(`no seeded account for ${role}; run the env stage first`);
    await page.goto('login');
    // The role card only frames the form; the session's role comes from the account.
    await page.getByRole('button', { name: /^Lanjutkan sebagai/ }).click();
    await page.getByLabel('Email').fill(account.email);
    await page.getByRole('textbox', { name: 'Kata sandi' }).fill(account.password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/overview$/);
    await page.context().storageState({ path: storageState(role) });
  });
}
