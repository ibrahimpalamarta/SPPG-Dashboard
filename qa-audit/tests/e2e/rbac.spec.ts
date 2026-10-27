import { expect, test } from '@playwright/test';
import { storageState, type RoleKey } from './roles.js';

// PRD §3 roles on today's permission map (migration 20261025000000_internal_auth,
// decision D-10): INTERNAL is view-only, DATA_ADMIN may also enter data.
const VIEW = ['Overview', 'Unggah Data', 'Mapping & Validasi', 'Finance & Cost', 'Data Health', 'Data Reference'];
const ADMIN_ONLY = ['Anggota', 'Peran & Izin'];

// Inbox is open to every role (SCRUM-20); DATA_ADMIN sees Anggota as a read-only list (PRD AC-MEM-01).
const CASES: { role: RoleKey; menu: string[]; hidden: string[]; kitchens: 'all' | string; anggota: 'ditolak' | 'lihat saja' }[] = [
  { role: 'management', menu: [...VIEW, 'Inbox'], hidden: ['Manual Entry', ...ADMIN_ONLY], kitchens: 'all', anggota: 'ditolak' },
  { role: 'finance', menu: [...VIEW, 'Inbox'], hidden: ['Manual Entry', ...ADMIN_ONLY], kitchens: 'all', anggota: 'ditolak' },
  { role: 'kepala-kitchen-skn', menu: [...VIEW, 'Inbox'], hidden: ['Manual Entry', ...ADMIN_ONLY], kitchens: 'Pilot Sukun', anggota: 'ditolak' },
  { role: 'data-steward', menu: [...VIEW, 'Manual Entry', 'Inbox', 'Anggota'], hidden: ['Peran & Izin'], kitchens: 'all', anggota: 'lihat saja' },
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

    test(`[P1-001][SCRUM-20] ${c.role} ${c.anggota === 'ditolak' ? 'ditolak membuka' : 'hanya melihat'} halaman Anggota lewat URL @smoke @rbac`, async ({ page }) => {
      const res = await page.goto('anggota');
      if (c.anggota === 'ditolak') {
        expect(res?.status()).toBe(403);
        await expect(page.getByText('Akses ditolak')).toBeVisible();
      } else {
        expect(res?.status()).toBe(200);
        await expect(page.getByRole('button', { name: 'Undang anggota' })).toHaveCount(0);
      }
    });
  });
}
