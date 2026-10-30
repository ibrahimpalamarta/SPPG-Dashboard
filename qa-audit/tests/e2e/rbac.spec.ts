import { expect, test } from '@playwright/test';
import { storageState, type RoleKey } from './roles.js';

// Dua role (SCRUM-152): Admin melihat semua dapur dan hanya melihat Upload History; Data Operasional
// terikat satu dapur, mengunggah dan mem-publish sendiri lewat Validasi Data.
const VIEW = ['Overview', 'Finance & Cost', 'Kelengkapan Data', 'Data Reference', 'Upload History', 'Inbox'];

const CASES: { role: RoleKey; menu: string[]; hidden: string[] }[] = [
  { role: 'admin', menu: [...VIEW, 'Anggota'], hidden: ['Unggah Data', 'Validasi Data'] },
  { role: 'data-operasional-skn', menu: [...VIEW, 'Unggah Data', 'Validasi Data'], hidden: ['Anggota'] },
];

for (const c of CASES) {
  test.describe(c.role, () => {
    test.use({ storageState: storageState(c.role) });

    test(`[P1-001][SCRUM-152] ${c.role} melihat menu sesuai role @smoke @rbac`, async ({ page }) => {
      await page.goto('overview');
      const nav = page.getByRole('navigation', { name: 'Menu utama' });
      for (const label of c.menu) await expect(nav.getByRole('link', { name: label })).toBeVisible();
      for (const label of c.hidden) await expect(nav.getByRole('link', { name: label })).toHaveCount(0);
    });
  });
}

test.describe('data-operasional-skn', () => {
  test.use({ storageState: storageState('data-operasional-skn') });

  test('[P1-001][SCRUM-20] Data Operasional ditolak membuka halaman Anggota lewat URL @smoke @rbac', async ({ page }) => {
    const res = await page.goto('anggota');
    expect(res?.status()).toBe(403);
    await expect(page.getByText('Akses ditolak')).toBeVisible();
  });
});

test.describe('admin', () => {
  test.use({ storageState: storageState('admin') });

  test('[SCRUM-148] Admin ditolak membuka Validasi Data dan Unggah Data lewat URL @smoke @rbac', async ({ page }) => {
    for (const path of ['mapping-validasi', 'unggah-data']) {
      expect((await page.goto(path))?.status(), path).toBe(403);
    }
  });
});
