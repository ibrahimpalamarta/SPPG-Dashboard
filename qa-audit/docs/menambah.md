# Menambah test, fixture, halaman, tool

## Test E2E
1. Buat `tests/e2e/<area>.spec.ts`. Judul: `[ID] deskripsi @tag` (lihat [requirements.md](requirements.md)).
2. Pilih role: `test.use({ storageState: storageState('finance') })` dari `tests/e2e/roles.ts`.
3. Navigasi relatif: `page.goto('finance')`, bukan `'/finance'` (basePath `/admin`).
4. Selector: `getByRole`/`getByLabel` dulu; `getByTestId` hanya untuk kontrak
   [data-testid.md](data-testid.md).
5. Fitur belum ada → `test.fixme('[AC-PUB-01] ... @smoke', async () => { /* langkah sesuai PRD */ })`.
6. Jalankan: `npm run stage:env` lalu `npx playwright test tests/e2e/<area>.spec.ts`.

## Logic test
`tests/logic/<area>.test.ts` (Vitest). Impor fungsi murni dari `../../../backend/src/lib/...`.
Jangan menyentuh database atau jaringan di sini; itu tugas E2E. Belum ada fungsinya →
`it.todo('[AC-DQ-01] ...')` (tercatat sebagai fixme).

## Fixture
Dibuat script (fase 2: `scripts/fixtures.ts`, exceljs), nilai karangan, header meniru template
nyata (D-08). Jangan pernah commit file sampel dapur asli.

## Halaman baru
1. Tambah login/permission yang dibutuhkan di `scripts/seed-qa.ts` bila ada role baru.
2. Tambah test `@rbac` (role yang boleh dan yang ditolak) dan `@a11y` (axe) untuk halaman itu.
3. Halaman kunci: tambahkan ke daftar URL Lighthouse (fase 3).

## Tool baru
1. Jalankan tool di `scripts/code-audit.ts` (atau tahap yang sesuai), tulis output mentah ke
   `reports/raw/<tool>.<ext>`; bila tool tidak ada, tulis `<tool>.skipped.json`.
2. Tambah parser di `collect()` (`scripts/merge-report.ts`) dan severity di `gate.json`.
3. Pasang tool di composite action `qa-setup` dengan versi di-pin.
4. Tambah kasus di `tests/logic/gate.test.ts`, perbarui [kontrak-output.md](kontrak-output.md)
   dan [decision-log.md](decision-log.md).
