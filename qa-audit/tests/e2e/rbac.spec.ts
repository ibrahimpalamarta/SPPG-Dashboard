import { expect, test } from '@playwright/test';
import { storageState, type RoleKey } from './roles.js';

// PRD §3 roles on the permission map seeded by migration 20261027000000_rbac_prd_oktober:
// Management, Finance and Kepala Kitchen are view-only, Data Steward may also upload.
const VIEW = ['Overview', 'Unggah Data', 'Mapping & Validasi', 'Finance & Cost', 'Data Health', 'Data Reference'];
const ADMIN_ONLY = ['Anggota', 'Peran & Izin'];

const CASES: { role: RoleKey; menu: string[]; hidden: string[]; kitchens: 'all' | string }[] = [
  { role: 'management', menu: VIEW, hidden: ['Manual Entry', 'Inbox', ...ADMIN_ONLY], kitchens: 'all' },
  { role: 'finance', menu: VIEW, hidden: ['Manual Entry', 'Inbox', ...ADMIN_ONLY], kitchens: 'all' },
  { role: 'kepala-kitchen-skn', menu: VIEW, hidden: ['Manual Entry', 'Inbox', ...ADMIN_ONLY], kitchens: 'Pilot Sukun' },
  { role: 'data-steward', menu: [...VIEW, 'Manual Entry', 'Inbox'], hidden: ADMIN_ONLY, kitchens: 'all' },
];

for (const c of CASES) {
  test.describe(c.role, () => {
    test.use({ storageState: storageState(c.role) });

    test(`[P1-001][SCRUM-20] ${c.role} melihat menu dan dapur sesuai role @smoke @rbac`, async ({ page }) => {
      await page.goto('overview');
      const nav = page.getByRole('navigation', { name: 'Menu utama' });
      for (const label of c.menu) await expect(nav.getByRole('link', { name: label })).toBeVisible();
      for (const label of c.hidden) await expect(nav.getByRole('link', { name: label })).toHaveCount(0);

      // The sidebar lists the dapur in the caller's scope (the pilot one is prefixed "Pilot").
      const kitchens = page.getByLabel('Navigasi utama').locator('p[title]');
      if (c.kitchens === 'all') {
        for (const k of ['Pilot Sukun', 'Lawang']) await expect(kitchens).toContainText(k);
      } else await expect(kitchens).toHaveText(c.kitchens);
    });

    test(`[P1-001][SCRUM-20] ${c.role} ditolak saat membuka halaman admin lewat URL @smoke @rbac`, async ({ page }) => {
      const res = await page.goto('anggota');
      expect(res?.status()).toBe(403);
      await expect(page.getByText('Akses ditolak')).toBeVisible();
    });
  });
}
