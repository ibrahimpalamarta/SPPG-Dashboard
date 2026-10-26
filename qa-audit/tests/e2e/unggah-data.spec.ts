import { expect, test } from '@playwright/test';
import { statSync } from 'node:fs';
import { storageState } from './roles.js';

test.describe('Unggah Data', () => {
  test.use({ storageState: storageState('data-steward') });

  test('[SCRUM-5][SCRUM-22] form unggah: pilih kitchen, jenis data, periode @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    await expect(page.getByRole('heading', { name: 'Unggah Data' })).toBeVisible();
    await expect(page.getByText('1. Pilih kitchen')).toBeVisible();
    await expect(page.getByRole('button', { name: /Cashflow/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Input Maker/ })).toBeVisible();
    await expect(page.getByLabel(/Periode/)).toBeVisible();
  });

  test('[SCRUM-25] riwayat unggahan menampilkan profil mapping, validasi, dan publish @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    for (const col of ['Profil mapping', 'Divalidasi', 'Dipublish']) await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
  });

  test('[SCRUM-125][SCRUM-130] template cashflow resmi bisa diunduh dengan file xlsx @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    const link = page.getByRole('link', { name: 'Unduh template kosong resmi' });
    await expect(link).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    expect(download.suggestedFilename()).toBe('template-cashflow-v1.xlsx');
    // Sheets, headers and dropdowns are asserted in backend/src/lib/templates.test.ts.
    expect(statSync((await download.path())!).size).toBeGreaterThan(2000);
    await page.getByRole('button', { name: /Master Menu/ }).click();
    await expect(link).toBeVisible();
    await page.getByRole('button', { name: /Purchase Order/ }).click();
    await expect(link).toHaveCount(0);
  });
});
