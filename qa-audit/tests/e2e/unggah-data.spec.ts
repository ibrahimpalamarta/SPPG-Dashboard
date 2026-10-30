import { expect, test, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { shot } from './evidence.js';
import { storageState } from './roles.js';

// Jenis data is the first combobox of the page; the history filters below the form carry the same label.
const jenisData = (page: Page) => page.getByRole('combobox', { name: 'Jenis data' }).first();

test.describe('Unggah Data', () => {
  test.use({ storageState: storageState('data-operasional-skn') });

  test('[SCRUM-5][SCRUM-22] form unggah: dapur, jenis data, bulan, file @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    await expect(page.getByRole('heading', { name: 'Unggah Data' })).toBeVisible();
    // SCRUM-144: Data Operasional is tied to one dapur, so the dapur is shown, not picked.
    await expect(page.getByText(/^SKN/).first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Dapur' })).toHaveCount(0);
    await expect(jenisData(page)).toHaveValue('CASHFLOW');
    await expect(jenisData(page).getByRole('option', { name: 'Input Maker' })).toHaveCount(1);
    await expect(page.getByLabel(/Bulan/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upload History' })).toBeVisible();
  });

  test('[SCRUM-25] riwayat unggahan menampilkan profil mapping, validasi, dan publish @smoke', async ({ page }) => {
    // The full history (with these columns) lives on Validasi Data; Unggah Data shows a shorter one under the form.
    await page.goto('mapping-validasi');
    for (const col of ['Profil mapping', 'Divalidasi', 'Dipublish']) await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
  });

  test('[SCRUM-125][SCRUM-130] template cashflow resmi bisa diunduh dengan file xlsx @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    const link = page.getByRole('link', { name: 'Download template' });
    await expect(link).toBeVisible();
    await shot(page, 'SCRUM-125', 1, 'cashflow-ada-link-template');
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    expect(download.suggestedFilename()).toBe('template-cashflow-v1.xlsx');
    // Sheets, headers and dropdowns are asserted in backend/src/lib/templates.test.ts.
    expect(statSync((await download.path())!).size).toBeGreaterThan(2000);
    await jenisData(page).selectOption({ label: 'Master Menu' });
    await expect(link).toBeVisible();
    await shot(page, 'SCRUM-125', 2, 'menu-ada-link-template');
    await jenisData(page).selectOption({ label: 'Purchase Order' });
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
  async function pick(page: Page, domain: string | null, name: string, buffer: Buffer, ticket?: string, formShot = false) {
    await page.goto('unggah-data');
    if (domain) await jenisData(page).selectOption({ label: domain });
    if (ticket && formShot) await shot(page, ticket, 1, 'pilih-kitchen-dan-jenis-data');
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'text/csv', buffer });
    // The check card (FR-AI-01) is what turns Unggah on.
    await expect(page.getByRole('button', { name: 'Unggah', exact: true })).toBeEnabled();
    if (ticket) await shot(page, ticket, formShot ? 2 : 1, 'file-dipilih-dicek');
  }
  const submit = (page: Page) => page.getByRole('button', { name: 'Unggah', exact: true }).click();

  test('[SCRUM-5][SCRUM-22][SCRUM-24][SCRUM-35][SCRUM-37] cashflow Sukun terunggah, profil terdeteksi, baris dipetakan @smoke', async ({ page }) => {
    await pick(page, null, 'cashflow-sukun.csv', cashflow, 'SCRUM-5', true);
    await submit(page);
    await expect(result(page).getByText('Perlu dicek')).toBeVisible();
    await shot(page, 'SCRUM-5', 3, 'hasil-unggah');
    await shot(result(page), 'SCRUM-35', 1, 'hasil-cashflow-terbaca');
    await page.goto('mapping-validasi');
    const row = page.getByRole('row', { name: /cashflow-sukun\.csv/ });
    await expect(row).toBeVisible();
    await shot(row, 'SCRUM-22', 1, 'metadata-batch-di-riwayat');
  });

  test('[SCRUM-36] menu Sukun terunggah dengan profil menu @smoke', async ({ page }) => {
    await pick(page, 'Master Menu', 'menu-sukun.csv', menu);
    await submit(page);
    await expect(result(page).getByText('Perlu dicek')).toBeVisible();
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
    await expect(result(page).getByText('Format berbeda')).toBeVisible();
    await expect(result(page).getByText(/Kolom tidak ditemukan/)).toBeVisible();
    await shot(page, 'SCRUM-124', 1, 'perbedaan-kolom');
    await page.getByRole('button', { name: 'Unggah Ulang File' }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'cashflow-perbaikan.csv', mimeType: 'text/csv', buffer: Buffer.from(`${cashflow.toString('utf8')}\n`) });
    await shot(page, 'SCRUM-124', 2, 'file-pengganti-dipilih');
    await submit(page);
    await expect(result(page).getByText('Perlu dicek')).toBeVisible();
    await page.goto('mapping-validasi');
    const row = page.getByRole('row', { name: /kolom-beda\.csv/ });
    await expect(row.getByText('Diganti')).toBeVisible();
    await shot(row, 'SCRUM-124', 3, 'berkas-lama-diganti');
    await page.getByRole('columnheader', { name: 'Dipublish' }).scrollIntoViewIfNeeded();
    await shot(page, 'SCRUM-25', 1, 'kolom-profil-validasi-publish');
  });

  test('[SCRUM-39] Ubah Mapping: kolom tak dikenal diarahkan ke kolom SOP, file lalu dikenali profil @smoke', async ({ page }) => {
    await pick(page, null, 'kolom-tgl.csv', Buffer.from(cashflow.toString('utf8').replace(',tanggal,', ',tgl,')));
    await page.getByRole('button', { name: 'Ubah Mapping' }).click();
    await page.getByLabel('Dibaca sebagai untuk kolom tgl').selectOption('txn_date');
    await expect(page.getByText('Diubah')).toBeVisible();
    await page.getByRole('button', { name: 'Selesai' }).click();
    await submit(page);
    // Without the override this file is "Format berbeda".
    await expect(result(page).getByText('Perlu dicek')).toBeVisible();
  });
});
