# SCRUM-76: [DATA-043] Build nutrition & delivered-count semantic query
Tahap: 7 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `nutritionBySegment`: gizi per porsi = Σ baris bahan sehari per segmen, dirata-rata hanya atas hari yang lengkap untuk zat itu (`incompleteDays`); porsi rencana = Jumlah PM terbesar per hari.
- [x] Jumlah tersalurkan dari `beneficiary_daily_counts`; tanpa data = `MISSING`, bukan 0.

## Sisa pekerjaan
- [ ] Sumber porsi tersalurkan harian Sukun (B-SRC-SKN).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
