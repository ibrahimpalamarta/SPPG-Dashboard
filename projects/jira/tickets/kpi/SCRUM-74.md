# SCRUM-74: [DATA-042] Build Top 5 Menu semantic query
Tahap: 7 | Status: IN_PROGRESS (siap review; OD-13 ASUMSI D-21) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `topMenus`: dari `menu_recipe_lines` published, window 14 hari tanggal layanan, filter daerah, tanpa makanan pokok/bumbu/garnish, ranking = hari layanan berbeda (`basis` di response).

## Sisa pekerjaan
- [ ] Dasar ranking final menunggu OD-13.

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
