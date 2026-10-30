import { expect, test, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { shot } from './evidence.js';
import { storageState } from './roles.js';

test.describe('Unggah Data', () => {
  test.use({ storageState: storageState('data-operasional-skn') });

  test('[SCRUM-5][SCRUM-22] form unggah: pilih kitchen, jenis data, periode @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    await expect(page.getByRole('heading', { name: 'Unggah Data' })).toBeVisible();
    // SCRUM-144: Data Operasional is tied to one dapur, so the dapur is shown, not picked.
    await expect(page.getByText(/^Dapur: SKN/)).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Cashflow/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Input Maker/ })).toBeVisible();
    await expect(page.getByLabel(/Periode/)).toBeVisible();
  });

  test('[SCRUM-25] riwayat unggahan menampilkan profil mapping, validasi, dan publish @smoke', async ({ page }) => {
    // Upload history lives on Validasi Data now — Unggah Data itself only has the upload form.
    await page.goto('mapping-validasi');
    for (const col of ['Profil mapping', 'Divalidasi', 'Dipublish']) await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
  });

  test('[SCRUM-125][SCRUM-130] template cashflow resmi bisa diunduh dengan file xlsx @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    const link = page.getByRole('link', { name: 'Unduh template kosong resmi' });
    await expect(link).toBeVisible();
    await shot(page, 'SCRUM-125', 1, 'cashflow-ada-link-template');
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    expect(download.suggestedFilename()).toBe('template-cashflow-v1.xlsx');
    // Sheets, headers and dropdowns are asserted in backend/src/lib/templates.test.ts.
    expect(statSync((await download.path())!).size).toBeGreaterThan(2000);
    await page.getByRole('button', { name: /Master Menu/ }).click();
    await expect(link).toBeVisible();
    await shot(page, 'SCRUM-125', 2, 'menu-ada-link-template');
    await page.getByRole('button', { name: /Purchase Order/ }).click();
    await expect(link).toHaveCount(0);
    await shot(page, 'SCRUM-125', 3, 'jenis-lain-tanpa-link');
  });
});

// Uploads need the S3 stub of the QA environment (scripts/env.ts). One test at a
// time: every upload lands in the same database and the history is read back.
test.describe.serial('Unggah Data: unggah file', () => {
  test.use({ storageState: storageState('data-operasional-skn') });

  const fixtures = '../backend/src/lib/ingest/fixtures/';
  const cashflow = readFileSync(`${fixtures}sukun-cashflow.csv`);
  const menu = readFileSync(`${fixtures}sukun-menu.csv`);

  const result = (page: Page) => page.locator('section[aria-live=polite]');

  // Steps up to the chosen file, so tests can capture each step of the flow.
  async function pick(page: Page, domain: RegExp | null, name: string, buffer: Buffer, ticket?: string, formShot = false) {
    await page.goto('unggah-data');
    if (domain) await page.getByRole('button', { name: domain }).click();
    if (ticket && formShot) await shot(page, ticket, 1, 'pilih-kitchen-dan-jenis-data');
    await page.getByRole('button', { name: 'Lanjut pilih file' }).click();
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'text/csv', buffer });
    if (ticket) await shot(page, ticket, formShot ? 2 : 1, 'file-dipilih');
  }
  const submit = (page: Page) => page.getByRole('button', { name: 'Unggah', exact: true }).click();

  test('[SCRUM-5][SCRUM-22][SCRUM-24][SCRUM-35][SCRUM-37] cashflow Sukun terunggah, profil terdeteksi, baris dipetakan @smoke', async ({ page }) => {
    await pick(page, null, 'cashflow-sukun.csv', cashflow, 'SCRUM-5', true);
    await submit(page);
    await expect(page.getByText(/Profil terdeteksi:\s*MAP-SKN-CF-001/)).toBeVisible();
    await expect(page.getByText(/record dipetakan/)).toBeVisible();
    await expect(page.getByText('Needs Review')).toBeVisible();
    await shot(page, 'SCRUM-5', 3, 'hasil-unggah');
    await shot(result(page), 'SCRUM-35', 1, 'hasil-cashflow-terbaca');
    await page.goto('mapping-validasi');
    const row = page.getByRole('row', { name: /cashflow-sukun\.csv/ });
    await expect(row).toBeVisible();
    await shot(row, 'SCRUM-22', 1, 'metadata-batch-di-riwayat');
  });

  test('[SCRUM-36] menu Sukun terunggah dengan profil menu @smoke', async ({ page }) => {
    await pick(page, /^Master Menu/, 'menu-sukun.csv', menu);
    await submit(page);
    await expect(page.getByText(/Profil terdeteksi:\s*MAP-SKN-MENU-001/)).toBeVisible();
    await shot(result(page), 'SCRUM-36', 1, 'hasil-menu-terbaca');
  });

  test('[SCRUM-131] template tanpa baris data ditahan sebagai file kosong @smoke', async ({ page }) => {
    await pick(page, null, 'kosong.csv', Buffer.from(cashflow.toString('utf8').split(/\r?\n/)[0] ?? ''), 'SCRUM-131');
    await submit(page);
    await expect(page.getByText('Ditahan · file kosong').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unggah Ulang File' })).toBeVisible();
    await shot(page, 'SCRUM-131', 2, 'ditahan-file-kosong');
  });

  test('[SCRUM-124][SCRUM-25] kolom berbeda menampilkan perbedaan, unggah ulang menandai berkas lama Diganti @smoke', async ({ page }) => {
    await pick(page, null, 'kolom-beda.csv', Buffer.from('id,txn_id,tanggal\n1,TXN-1,01/03/2026\n'));
    await submit(page);
    await expect(page.getByText('Needs Mapping Update')).toBeVisible();
    await expect(page.getByText('Perbedaan kolom dengan format yang dikenal')).toBeVisible();
    await shot(page, 'SCRUM-124', 1, 'perbedaan-kolom');
    await page.getByRole('button', { name: 'Unggah Ulang File' }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'cashflow-perbaikan.csv', mimeType: 'text/csv', buffer: Buffer.from(`${cashflow.toString('utf8')}\n`) });
    await shot(page, 'SCRUM-124', 2, 'file-pengganti-dipilih');
    await submit(page);
    await expect(page.getByText(/Profil terdeteksi:\s*MAP-SKN-CF-001/)).toBeVisible();
    await page.goto('mapping-validasi');
    const row = page.getByRole('row', { name: /kolom-beda\.csv/ });
    await expect(row.getByText('Diganti')).toBeVisible();
    await shot(row, 'SCRUM-124', 3, 'berkas-lama-diganti');
    await page.getByRole('columnheader', { name: 'Dipublish' }).scrollIntoViewIfNeeded();
    await shot(page, 'SCRUM-25', 1, 'kolom-profil-validasi-publish');
  });
});
