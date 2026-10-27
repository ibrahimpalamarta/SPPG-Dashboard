# SCRUM-28: Sukun RAB adapter MAP-SKN-RAB-001
Tahap: 3 (label Jira: stage-4) | Status: IN REVIEW | Terakhir diubah: 2026-10-27

## Yang sudah dikerjakan
- [x] `applySukunRab` (`lib/mapping/sukun-rab.ts`): membaca baris lewat `applySukunMenu` (parsing angka/tanggal, dedup DQ-031), lalu mengelompokkan per (tanggal, segmen). Total Harga kosong dilaporkan (NO_LINE_TOTAL, DQ-019), tidak diisi.
- [x] Hasil disimpan saat upload ke `rab_daily_budgets` + `rab_ingredient_budgets` (`lib/mapping/persist.ts`), satu transaksi dengan staging; internal-only (tanpa GRANT ke `sppg_public`).
- [x] `pipeline.ts`: domain `RAB` memakai `menuParser` (sebelumnya parser mentah generik).

## Test
`src/lib/mapping/sukun-rab.test.ts`, `src/lib/ingest/staging-prisma.test.ts`
