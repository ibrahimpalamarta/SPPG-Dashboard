import { expect, test } from '@playwright/test';
import { shot } from './evidence.js';
import { storageState } from './roles.js';

// Inbox dan lonceng notifikasi memakai data seed QA (scripts/seed-qa.ts): file Cashflow SKN dan Menu LWG yang formatnya
// belum dikenali, dan satu undangan yang kedaluwarsa. Tiap role hanya melihat tugas sesuai izin dan dapurnya (SCRUM-152).
const SKN = 'Cashflow_Sukun_Minggu2_Nov2026.xlsx';
const LWG = 'Menu_Lawang_Nov2026.xlsx';
const UNDANGAN = 'Siti Rahmawati';

test.describe('Inbox Admin', () => {
  test.use({ storageState: storageState('admin') });

  test('[SCRUM-152] Admin melihat undangan kedaluwarsa di Inbox dan lonceng, bukan file yang harus diperbaiki dapur @smoke', async ({ page }) => {
    await page.goto('inbox');
    await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Undangan kedaluwarsa' })).toBeVisible();
    await expect(page.getByText(UNDANGAN)).toBeVisible();
    await expect(page.getByText(SKN)).toHaveCount(0);
    await expect(page.getByText(LWG)).toHaveCount(0);
    await shot(page, 'SCRUM-152', 1, 'inbox-admin-undangan-kedaluwarsa');

    await page.getByRole('button', { name: 'Notifikasi' }).click();
    await expect(page.getByText(UNDANGAN).first()).toBeVisible();
  });
});

test.describe('Inbox Data Operasional SKN', () => {
  test.use({ storageState: storageState('data-operasional-skn') });

  test('[SCRUM-152] Data Operasional SKN hanya melihat file dapurnya, lengkap dengan alasan dan kolom yang hilang @smoke', async ({ page }) => {
    await page.goto('inbox');
    await expect(page.getByRole('heading', { name: 'File perlu diperbaiki' })).toBeVisible();
    await expect(page.getByText(SKN)).toBeVisible();
    await expect(page.getByText(/Kolom tidak ditemukan: txn_id, tanggal, harga_satuan/)).toBeVisible();
    await expect(page.getByText(LWG)).toHaveCount(0);
    await expect(page.getByText(UNDANGAN)).toHaveCount(0);
    await shot(page, 'SCRUM-152', 2, 'inbox-data-operasional-skn');

    await page.getByRole('button', { name: 'Notifikasi' }).click();
    await expect(page.getByText(SKN).first()).toBeVisible();
    await expect(page.getByText(LWG)).toHaveCount(0);
  });
});

test.describe('Inbox Data Operasional LWG', () => {
  test.use({ storageState: storageState('data-operasional-lwg') });

  test('[SCRUM-152] Data Operasional LWG hanya melihat file Lawang, tidak file Sukun @smoke', async ({ page }) => {
    await page.goto('inbox');
    await expect(page.getByText(LWG)).toBeVisible();
    await expect(page.getByText(SKN)).toHaveCount(0);
    await shot(page, 'SCRUM-152', 3, 'inbox-data-operasional-lwg');
  });
});
