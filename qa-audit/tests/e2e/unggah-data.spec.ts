import { expect, test, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { shot } from './evidence.js';
import { storageState } from './roles.js';
import { pilih, validasiDanPublish } from './ui.js';

const jenisData = (page: Page) => page.getByRole('combobox', { name: 'Jenis data', exact: true });

test.describe('Unggah Data', () => {
  test.use({ storageState: storageState('data-operasional-skn') });

  test('[SCRUM-5][SCRUM-22] form unggah: dapur, jenis data, bulan, file @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    await expect(page.getByRole('heading', { name: 'Unggah Data' })).toBeVisible();
    // SCRUM-144: Data Operasional is tied to one dapur, so the dapur is shown, not picked.
    await expect(page.getByText(/^SKN/).first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Dapur' })).toHaveCount(0);
    await expect(jenisData(page)).toHaveText('Cashflow');
    await jenisData(page).click();
    await expect(page.getByRole('option', { name: 'Input Maker' })).toHaveCount(1);
    await expect(page.getByLabel(/Bulan/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upload History' })).toBeVisible();
  });

  test('[SCRUM-25] riwayat unggahan menampilkan profil mapping, validasi, dan publish @smoke', async ({ page }) => {
    // The full history lives on Upload History; the status badge carries validation and publish, the mapping profile is in the opened file.
    await page.goto('mapping-validasi');
    for (const col of ['File', 'Dapur', 'Jenis data', 'Diunggah', 'Status']) await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
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
    await pilih(page, 'Jenis data', 'Master Menu');
    await expect(link).toBeVisible();
    await shot(page, 'SCRUM-125', 2, 'menu-ada-link-template');
    await pilih(page, 'Jenis data', 'Purchase Order');
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
    if (domain) await pilih(page, 'Jenis data', domain);
    if (ticket && formShot) await shot(page, ticket, 1, 'pilih-kitchen-dan-jenis-data');
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'text/csv', buffer });
    // The check card (FR-AI-01) is what turns Validasi Data on.
    await expect(page.getByRole('button', { name: 'Validasi Data' })).toBeEnabled();
    if (ticket) await shot(page, ticket, formShot ? 2 : 1, 'file-dipilih-dicek');
  }
  const submit = (page: Page) => validasiDanPublish(page);
  // A file with "Wajib diperbaiki" findings stays held after Publish; one without goes live.
  const heldOrPublished = /Perlu dicek|Dipublish/;

  test('[SCRUM-5][SCRUM-22][SCRUM-24][SCRUM-35][SCRUM-37] cashflow Sukun terunggah, profil terdeteksi, baris dipetakan @smoke', async ({ page }) => {
    await pick(page, null, 'cashflow-sukun.csv', cashflow, 'SCRUM-5', true);
    await submit(page);
    await expect(result(page).getByText(heldOrPublished)).toBeVisible();
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
    await expect(result(page).getByText(heldOrPublished)).toBeVisible();
    await shot(result(page), 'SCRUM-36', 1, 'hasil-menu-terbaca');
  });

  test('[SCRUM-131] template tanpa baris data ditahan sebagai file kosong @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    await page.locator('input[type=file]').setInputFiles({ name: 'kosong.csv', mimeType: 'text/csv', buffer: Buffer.from(cashflow.toString('utf8').split(/\r?\n/)[0] ?? '') });
    // The check already finds no rows, so there is nothing to validate.
    await expect(page.getByRole('alert').filter({ hasText: 'File tidak berisi baris data' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Validasi Data' })).toBeDisabled();
    await shot(page, 'SCRUM-131', 1, 'ditahan-file-kosong');
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
    await expect(result(page).getByText(heldOrPublished)).toBeVisible();
    await page.goto('mapping-validasi');
    const row = page.getByRole('row', { name: /kolom-beda\.csv/ });
    await expect(row.getByText('Diganti')).toBeVisible();
    await shot(row, 'SCRUM-124', 3, 'berkas-lama-diganti');
    await shot(page, 'SCRUM-25', 1, 'kolom-status-validasi-publish');
  });

  test('[SCRUM-39] mapping: kolom tak dikenal diarahkan ke kolom SOP, file lalu dikenali profil @smoke', async ({ page }) => {
    await pick(page, null, 'kolom-tgl.csv', Buffer.from(cashflow.toString('utf8').replace(',tanggal,', ',tgl,')));
    await validasiDanPublish(page, async () => {
      const tgl = page.getByRole('row', { name: /tgl/ });
      await expect(tgl.getByText('Cocok')).toHaveCount(0);
      await pilih(page, 'Dibaca sebagai untuk kolom tgl', 'tanggal');
      await expect(tgl.getByText('Cocok')).toBeVisible();
    });
    // Without the override this file is "Format berbeda".
    await expect(result(page).getByText(heldOrPublished)).toBeVisible();
  });

  test('jenis data dikenali dari nama file, tanpa dipilih manual @smoke', async ({ page }) => {
    await page.goto('unggah-data');
    await page.locator('input[type=file]').setInputFiles({ name: '03_master_menu.csv', mimeType: 'text/csv', buffer: menu });
    await expect(jenisData(page)).toHaveText('Master Menu');
    await expect(page.getByRole('button', { name: 'Validasi Data' })).toBeEnabled();
    await page.locator('input[type=file]').setInputFiles({ name: 'CASHFLOW_SUKUN - Transaksi_Kas.csv', mimeType: 'text/csv', buffer: cashflow });
    await expect(jenisData(page)).toHaveText('Cashflow');
    await expect(page.getByRole('button', { name: 'Validasi Data' })).toBeEnabled();
  });

  test('Validasi Data: isi file tampil di tabel yang bisa diedit, tambah dan hapus baris @smoke', async ({ page }) => {
    await pick(page, 'Master Menu', 'menu-edit.csv', menu);
    await page.getByRole('button', { name: 'Validasi Data' }).click();
    await expect(page.getByText(/AI mencocokkan \d+ dari \d+ kolom/)).toBeVisible();
    await page.getByRole('button', { name: 'Simpan & Cek dengan AI' }).click();
    await expect(page.getByRole('heading', { name: 'Validasi Data' })).toBeVisible();
    const first = page.getByRole('textbox', { name: /^Menu, baris 1$/ });
    await first.fill('Nasi uduk');
    await expect(first).toHaveValue('Nasi uduk');
    // The hidden file step also says "N baris".
    const total = page.getByText(/^\d+ baris/).filter({ visible: true });
    const before = Number((await total.innerText()).split(' ')[0]);
    await page.getByRole('button', { name: 'Tambah data' }).click();
    await expect(total).toHaveText(new RegExp(`^${before + 1} baris`));
    await page.getByRole('checkbox', { name: 'Pilih baris 1', exact: true }).check();
    await page.getByRole('button', { name: 'Hapus 1 baris' }).click();
    await expect(total).toHaveText(new RegExp(`^${before} baris`));
    await shot(page, 'VALIDASI-DATA', 1, 'tabel-editable');
  });
});
