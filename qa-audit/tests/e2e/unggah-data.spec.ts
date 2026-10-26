import { expect, test, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
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
    await page.getByRole('columnheader', { name: 'Dipublish' }).scrollIntoViewIfNeeded();
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

// Uploads need the S3 stub of the QA environment (scripts/env.ts). One test at a
// time: every upload lands in the same database and the history is read back.
test.describe.serial('Unggah Data: unggah file', () => {
  test.use({ storageState: storageState('data-steward') });

  const fixtures = '../backend/src/lib/ingest/fixtures/';
  const cashflow = readFileSync(`${fixtures}sukun-cashflow.csv`);
  const menu = readFileSync(`${fixtures}sukun-menu.csv`);

  async function upload(page: Page, domain: RegExp | null, name: string, buffer: Buffer) {
    await page.goto('unggah-data');
    await page.getByRole('combobox').selectOption(await page.getByRole('option', { name: /SKN/ }).getAttribute('value') ?? '');
    if (domain) await page.getByRole('button', { name: domain }).click();
    await page.getByRole('button', { name: 'Lanjut pilih file' }).click();
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'text/csv', buffer });
    await page.getByRole('button', { name: 'Unggah', exact: true }).click();
  }

  test('[SCRUM-5][SCRUM-22][SCRUM-24][SCRUM-35][SCRUM-37] cashflow Sukun terunggah, profil terdeteksi, baris dipetakan @smoke', async ({ page }) => {
    await upload(page, null, 'cashflow-sukun.csv', cashflow);
    await expect(page.getByText(/Profil terdeteksi:\s*MAP-SKN-CF-001/)).toBeVisible();
    await expect(page.getByText(/record dipetakan/)).toBeVisible();
    await expect(page.getByText('Needs Review')).toBeVisible();
  });

  test('[SCRUM-36] menu Sukun terunggah dengan profil menu @smoke', async ({ page }) => {
    await upload(page, /^Master Menu/, 'menu-sukun.csv', menu);
    await expect(page.getByText(/Profil terdeteksi:\s*MAP-SKN-MENU-001/)).toBeVisible();
  });

  test('[SCRUM-131] template tanpa baris data ditahan sebagai file kosong @smoke', async ({ page }) => {
    await upload(page, null, 'kosong.csv', Buffer.from(cashflow.toString('utf8').split(/\r?\n/)[0] ?? ''));
    await expect(page.getByText('Ditahan · file kosong').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unggah Ulang File' })).toBeVisible();
  });

  test('[SCRUM-124][SCRUM-25] kolom berbeda menampilkan perbedaan, unggah ulang menandai berkas lama Diganti @smoke', async ({ page }) => {
    await upload(page, null, 'kolom-beda.csv', Buffer.from('id,txn_id,tanggal\n1,TXN-1,01/03/2026\n'));
    await expect(page.getByText('Needs Mapping Update')).toBeVisible();
    await expect(page.getByText('Perbedaan kolom dengan format yang dikenal')).toBeVisible();
    await page.getByRole('button', { name: 'Unggah Ulang File' }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'cashflow-perbaikan.csv', mimeType: 'text/csv', buffer: Buffer.from(`${cashflow.toString('utf8')}\n`) });
    await page.getByRole('button', { name: 'Unggah', exact: true }).click();
    await expect(page.getByText(/Profil terdeteksi:\s*MAP-SKN-CF-001/)).toBeVisible();
    await page.goto('unggah-data');
    const row = page.getByRole('row', { name: /kolom-beda\.csv/ });
    await expect(row.getByText('Diganti')).toBeVisible();
    await row.scrollIntoViewIfNeeded();
  });
});
