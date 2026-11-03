import { expect, test, type Page } from '@playwright/test';
import { storageState, type RoleKey } from './roles.js';

// Pilihan bahasa ID/EN di header: ID tidak berubah, EN menerjemahkan menu, judul, dan isi halaman
// dengan judul halaman sama persis dengan nama menu.
const PAGES: Record<RoleKey, { path: string; id: string; en: string }[]> = {
  admin: [
    { path: 'overview', id: 'Overview', en: 'Overview' },
    { path: 'finance', id: 'Finance & Cost', en: 'Finance & Cost' },
    { path: 'kesehatan-data', id: 'Kelengkapan Data', en: 'Data Completeness' },
    { path: 'mapping-validasi', id: 'Upload History', en: 'Upload History' },
    { path: 'referensi-data', id: 'Data Reference', en: 'Data Reference' },
    { path: 'inbox', id: 'Inbox', en: 'Inbox' },
    { path: 'anggota', id: 'Anggota', en: 'Members' },
  ],
  'data-operasional-skn': [
    { path: 'overview', id: 'Overview', en: 'Overview' },
    { path: 'finance', id: 'Finance & Cost', en: 'Finance & Cost' },
    { path: 'kesehatan-data', id: 'Kelengkapan Data', en: 'Data Completeness' },
    { path: 'unggah-data', id: 'Unggah Data', en: 'Upload Data' },
    { path: 'mapping-validasi', id: 'Upload History', en: 'Upload History' },
    { path: 'referensi-data', id: 'Data Reference', en: 'Data Reference' },
    { path: 'inbox', id: 'Inbox', en: 'Inbox' },
  ],
};

// Kata fungsi Indonesia yang tidak boleh tersisa di tampilan EN (data dari backend, mis. nama dapur, tidak memuatnya).
const INDONESIAN = /\b(yang|dan|atau|belum|untuk|dengan|tidak|sudah|dapur|Lihat|Unggah|Buka|Kirim|Simpan|Batal|Hapus|Pilih|Semua|Ubah|Kelola|Tambah|Tampilkan|Keluar|Pengaturan|Bulan|Tanggal|Hari)\b/;

const useEnglish = (page: Page) => page.context().addCookies([{ name: 'lang', value: 'en', url: 'http://localhost:13000/' }]);

for (const role of Object.keys(PAGES) as RoleKey[]) {
  test.describe(`bahasa ${role}`, () => {
    test.use({ storageState: storageState(role) });

    test(`[SCRUM-152] ${role}: judul halaman sama dengan nama menu di ID dan EN @smoke`, async ({ page }) => {
      for (const lang of ['id', 'en'] as const) {
        if (lang === 'en') await useEnglish(page);
        const nav = page.getByRole('navigation', { name: lang === 'en' ? 'Main menu' : 'Menu utama' });
        for (const p of PAGES[role]) {
          await page.goto(p.path);
          const menu = p[lang];
          await expect(nav.getByRole('link', { name: menu, exact: true })).toBeVisible();
          // Overview menyapa dengan nama pengguna dan Inbox kosong memakai judul empty state; halaman lain memakai nama menu sebagai judul.
          if (p.path !== 'overview' && p.path !== 'inbox') await expect(page.getByRole('heading', { level: 1, name: menu, exact: true })).toBeVisible();
        }
      }
    });

    test(`[SCRUM-152] ${role}: tampilan EN tidak menyisakan teks Indonesia @smoke`, async ({ page }) => {
      await useEnglish(page);
      const paths = PAGES[role].flatMap((p) => (p.path === 'referensi-data' ? ['referensi-data?tab=format', 'referensi-data?tab=alur'] : [p.path]));
      for (const path of paths) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        const text = await page.locator('body').innerText();
        const left = text.split('\n').filter((line) => INDONESIAN.test(line));
        expect(left, `${path} masih memuat teks Indonesia`).toEqual([]);
      }
    });

    test(`[SCRUM-152] ${role}: ID tetap Indonesia tanpa cookie bahasa @smoke`, async ({ page }) => {
      await page.goto('overview');
      await expect(page.getByRole('combobox', { name: 'Bahasa' })).toHaveText('ID');
      await expect(page.getByRole('navigation', { name: 'Menu utama' }).first()).toBeVisible();
    });
  });
}

test.describe('bahasa dropdown', () => {
  test.use({ storageState: storageState('admin') });

  test('[SCRUM-152] memilih EN di header langsung menerjemahkan menu dan bertahan setelah reload @smoke', async ({ page }) => {
    await page.goto('anggota');
    const nav = page.getByRole('navigation', { name: 'Main menu' });
    // Klik sebelum hydration terbuang diam-diam (lihat ui.ts): ulangi sampai menu berganti.
    await expect(async () => {
      await page.getByRole('combobox', { name: /^(Bahasa|Language)$/ }).click();
      await page.getByRole('option', { name: 'EN', exact: true }).click({ timeout: 2000 });
      await expect(nav.getByRole('link', { name: 'Members', exact: true })).toBeVisible({ timeout: 2000 });
    }).toPass();
    await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveText('EN');
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.getByRole('option', { name: 'ID', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Anggota' })).toBeVisible();
  });
});
