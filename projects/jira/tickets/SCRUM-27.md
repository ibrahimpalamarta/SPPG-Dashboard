# SCRUM-27: Sukun Cashflow adapter
Tahap: 3 | Status: IN_PROGRESS (sebagian BLOCKED: B-MAPOUT) | Terakhir diubah: 2026-10-26

## Yang sudah dikerjakan
- [x] `applySukunCashflow` (`lib/mapping/sukun-cashflow.ts`): baris dikelompokkan per `txn_id`, field transaksi dari baris pertama, line membawa `source_record_id`.
- [x] Dilaporkan sebagai issue, tidak dikoreksi: baris tanpa txn_id (NO_TXN_ID), qty/harga/jumlah kosong (MISSING_AMOUNT), Σ jumlah_baris ≠ total (LINES_NOT_TOTAL, toleransi Rp0,5), total beda antar baris (TOTAL_INCONSISTENT).
- [x] Ringkasan (`mapping`: profil, jumlah record, total per arah, hitungan issue, 50 issue pertama) ikut response upload.

## Sisa pekerjaan
- [ ] Simpan hasil (B-MAPOUT); tabel kanonik SCRUM-41/42

## Test
`src/lib/mapping/sukun-cashflow.test.ts`, `src/lib/mapping/values.test.ts`
