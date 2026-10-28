import { expect, test } from '@playwright/test';
import { storageState, type RoleKey } from './roles.js';

// PRD §3 roles on the permission map seeded by migration 20261027000000_rbac_prd_oktober:
// Management, Finance and Kepala Kitchen are view-only; only Data Steward may upload,
// so only it sees Unggah Data.
const VIEW = ['Overview', 'Validasi Data', 'Finance & Cost', 'Kelengkapan Data', 'Data Reference'];
const ADMIN_ONLY = ['Anggota', 'Peran & Izin'];

// Inbox is open to every role (SCRUM-20). Anggota needs users:read, held only by SUPER_ADMIN and
// DATA_ADMIN (Data Operasional, no QA account); Data Steward is DATA_STEWARD and is refused.
const CASES: { role: RoleKey; menu: string[]; hidden: string[] }[] = [
  { role: 'management', menu: [...VIEW, 'Inbox'], hidden: ['Unggah Data', ...ADMIN_ONLY] },
  { role: 'finance', menu: [...VIEW, 'Inbox'], hidden: ['Unggah Data', ...ADMIN_ONLY] },
  { role: 'kepala-kitchen-skn', menu: [...VIEW, 'Inbox'], hidden: ['Unggah Data', ...ADMIN_ONLY] },
  { role: 'data-steward', menu: [...VIEW, 'Unggah Data', 'Inbox'], hidden: ADMIN_ONLY },
];

for (const c of CASES) {
  test.describe(c.role, () => {
    test.use({ storageState: storageState(c.role) });

    test(`[P1-001][SCRUM-20] ${c.role} melihat menu sesuai role @smoke @rbac`, async ({ page }) => {
      await page.goto('overview');
      const nav = page.getByRole('navigation', { name: 'Menu utama' });
      for (const label of c.menu) await expect(nav.getByRole('link', { name: label })).toBeVisible();
      for (const label of c.hidden) await expect(nav.getByRole('link', { name: label })).toHaveCount(0);
    });

    test(`[P1-001][SCRUM-20] ${c.role} ditolak membuka halaman Anggota lewat URL @smoke @rbac`, async ({ page }) => {
      const res = await page.goto('anggota');
      expect(res?.status()).toBe(403);
      await expect(page.getByText('Akses ditolak')).toBeVisible();
    });
  });
}
