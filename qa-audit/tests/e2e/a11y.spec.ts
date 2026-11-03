import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { storageState, type RoleKey } from './roles.js';

// axe di halaman utama tiap role. critical/serious menggagalkan test (gate.json: axe critical/serious
// = Blocker). Sementara hanya @a11y (Warning): kontras text-slate-400 text-xs melanggar di hampir semua halaman (O-17); tambahkan @smoke setelah diperbaiki. moderate/minor hanya dicatat sebagai annotation di laporan Playwright.
const PAGES: { role: RoleKey | null; paths: string[] }[] = [
  { role: null, paths: ['login'] },
  { role: 'admin', paths: ['overview', 'finance', 'kesehatan-data', 'mapping-validasi', 'referensi-data', 'anggota', 'inbox'] },
  { role: 'data-operasional-skn', paths: ['overview', 'unggah-data', 'mapping-validasi'] },
];

for (const { role, paths } of PAGES) {
  test.describe(`a11y ${role ?? 'tanpa login'}`, () => {
    test.use({ storageState: role ? storageState(role) : { cookies: [], origins: [] } });

    for (const path of paths) {
      test(`[QA-A11Y] ${path} tanpa pelanggaran axe critical/serious @a11y`, async ({ page }, info) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        for (const v of violations.filter((x) => x.impact !== 'critical' && x.impact !== 'serious')) {
          info.annotations.push({ type: `axe-${v.impact}`, description: `${v.id}: ${v.help} (${v.nodes.length} elemen)` });
        }
        const berat = violations.filter((x) => x.impact === 'critical' || x.impact === 'serious');
        expect(berat.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length} elemen, mis. ${v.nodes[0]?.target.join(' ')})`)).toEqual([]);
      });
    }
  });
}
