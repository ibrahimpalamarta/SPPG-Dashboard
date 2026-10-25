import { expect, test } from '@playwright/test';
import { storageState, type RoleKey } from './roles.js';

// PRD §3 roles on today's permission map (migration 20261025000000_internal_auth,
// decision D-10): INTERNAL is view-only, DATA_ADMIN may also enter data.
const VIEW = ['Overview', 'Unggah Data', 'Mapping & Validasi', 'Finance & Cost', 'Data Health', 'Data Reference'];
const ADMIN_ONLY = ['Pengguna', 'Peran & Izin'];

const CASES: { role: RoleKey; menu: string[]; hidden: string[]; kitchens: 'all' | string[] }[] = [
  { role: 'management', menu: VIEW, hidden: ['Manual / Quick Entry', ...ADMIN_ONLY], kitchens: 'all' },
  { role: 'finance', menu: VIEW, hidden: ['Manual / Quick Entry', ...ADMIN_ONLY], kitchens: 'all' },
  { role: 'kepala-kitchen-skn', menu: VIEW, hidden: ['Manual / Quick Entry', ...ADMIN_ONLY], kitchens: ['SKN · Sukun'] },
  { role: 'data-steward', menu: [...VIEW, 'Manual / Quick Entry'], hidden: ADMIN_ONLY, kitchens: 'all' },
];

for (const c of CASES) {
  test.describe(c.role, () => {
    test.use({ storageState: storageState(c.role) });

    test(`[P1-001][SCRUM-20] ${c.role} melihat menu dan dapur sesuai role @smoke @rbac`, async ({ page }) => {
      await page.goto('overview');
      const nav = page.getByRole('navigation', { name: 'Menu utama' });
      for (const label of c.menu) await expect(nav.getByRole('link', { name: label })).toBeVisible();
      for (const label of c.hidden) await expect(nav.getByRole('link', { name: label })).toHaveCount(0);

      const kitchens = page.getByLabel('Dapur').locator('option');
      if (c.kitchens === 'all') {
        for (const k of ['SKN · Sukun', 'LWG · Lawang']) await expect(kitchens.filter({ hasText: k })).toHaveCount(1);
      } else await expect(kitchens).toHaveText(c.kitchens);
    });

    test(`[P1-001][SCRUM-20] ${c.role} ditolak saat membuka halaman admin lewat URL @smoke @rbac`, async ({ page }) => {
      const res = await page.goto('pengguna');
      expect(res?.status()).toBe(403);
      await expect(page.getByText('Akses ditolak')).toBeVisible();
    });
  });
}
