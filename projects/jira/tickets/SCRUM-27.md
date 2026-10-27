# SCRUM-27: Sukun Cashflow adapter
Tahap: 3 | Status: IN REVIEW | Terakhir diubah: 2026-10-27

## Yang sudah dikerjakan
- [x] `applySukunCashflow` (`lib/mapping/sukun-cashflow.ts`): baris dikelompokkan per `txn_id`, field transaksi dari baris pertama, line membawa `source_record_id`.
- [x] Dilaporkan sebagai issue, tidak dikoreksi: baris tanpa txn_id (NO_TXN_ID), qty/harga/jumlah kosong (MISSING_AMOUNT), Σ jumlah_baris ≠ total (LINES_NOT_TOTAL, toleransi Rp0,5), total beda antar baris (TOTAL_INCONSISTENT).
- [x] Ringkasan (`mapping`: profil, jumlah record, total per arah, hitungan issue, 50 issue pertama) ikut response upload.

- [x] Hasil disimpan saat upload (B-MAPOUT): `finance_transactions` (header, `txn_total` hanya di sini) + `finance_transaction_lines` (`source_record_id` unik), satu transaksi DB dengan staging (`lib/mapping/persist.ts`); parse ulang mengganti, hapus batch ikut cascade. Migrasi `20261027000000_canonical_cashflow_rab`.

- [x] Sesuai PRD §7.2: tiap transaksi membawa kitchen_id, source_system, source_file_name, template_version, mapping_profile_id, loaded_at, source_record_id (baris pertama). `is_external_spend` (§7.4: petty cash MASUK bukan pengeluaran eksternal, aturan final B-DD). View `finance_txn_upload` (§7.1) di atas `staging_rows`.
- [x] Rekonsiliasi berkas asli `[SKN] CASHFLOW_SUKUN` (2241 baris): 1009 transaksi, Σ KELUAR Rp3.672.960.322 + MASUK Rp34.500.000 = total sumber; issue 74 MISSING_AMOUNT, 37 NO_TXN_ID, 53 NEEDS_REVIEW.

## Sisa pekerjaan
- [ ] Nama field kanonik [USULAN] (B-DD); KPI hanya boleh membaca batch PUBLISHED (SCRUM-95)

## Test
`src/lib/mapping/sukun-cashflow.test.ts`, `src/lib/mapping/values.test.ts`
