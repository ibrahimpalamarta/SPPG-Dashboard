# SCRUM-50: [DATA-017] Create beneficiary_daily_count dataset
Tahap: 7 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Tabel `beneficiary_daily_counts` (migrasi `20261030040000_kpi_tahap7`): dapur × tanggal × lokasi × segmen, rencana dan aktual terpisah, NULL = belum ada, tanpa kolom PII, lineage supersede. Usulan: `SCRUM-50-schema.md`.

## Sisa pekerjaan
- [ ] Writer dari sumber PM harian Sukun (B-SRC-SKN).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
