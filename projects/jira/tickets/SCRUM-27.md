# SCRUM-27: Sukun Cashflow adapter
Tahap: 3 | Status: IN REVIEW | Terakhir diubah: 2026-10-27

## Yang sudah dikerjakan
- [x] `applySukunCashflow` (`lib/mapping/sukun-cashflow.ts`): baris dikelompokkan per `txn_id`, field transaksi dari baris pertama, line membawa `source_record_id`.
- [x] Dilaporkan sebagai issue, tidak dikoreksi: baris tanpa txn_id (NO_TXN_ID), qty/harga/jumlah kosong (MISSING_AMOUNT), Σ jumlah_baris ≠ total (LINES_NOT_TOTAL, toleransi Rp0,5), total beda antar baris (TOTAL_INCONSISTENT).
- [x] Ringkasan (`mapping`: profil, jumlah record, total per arah, hitungan issue, 50 issue pertama) ikut response upload.

- [x] Hasil disimpan saat upload (B-MAPOUT): `finance_transactions` (header, `txn_total` hanya di sini) + `finance_transaction_lines` (`source_record_id` unik), satu transaksi DB dengan staging (`lib/mapping/persist.ts`); parse ulang mengganti, hapus batch ikut cascade. Migrasi `20261027000000_canonical_cashflow_rab`.

## Sisa pekerjaan
- [ ] Nama field kanonik [USULAN] (B-DD); KPI hanya boleh membaca batch PUBLISHED (SCRUM-95)

## Test
`src/lib/mapping/sukun-cashflow.test.ts`, `src/lib/mapping/values.test.ts`
