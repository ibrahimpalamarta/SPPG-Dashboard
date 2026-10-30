# SCRUM-84: [DATA-046] Reconcile Cashflow canonical header to Ringkasan_Transaksi
Tahap: 5 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `reconcileRingkasan` (`lib/mapping/cashflow-checks.ts`), dipanggil pipeline di setiap upload CASHFLOW: sheet `Ringkasan_Transaksi` dibaca dari workbook mentah (tetap tidak di-stage, tidak membuat baris `finance_transactions`).
- [x] Dibandingkan: jumlah txn_id unik, txn_id yang hanya ada di satu sisi, total per transaksi, status_review, dan Σ total. Toleransi Rp1 (pembulatan).
- [x] Severity: selisih Σ total = CRITICAL (menahan batch), jumlah/txn hilang/total per txn = HIGH, status = MEDIUM. Sheet ringkasan tidak ada = `RECON_NO_SUMMARY` (MEDIUM/FLAG).

## Catatan
- Ekspor baseline Sukun yang datar tidak membawa Ringkasan_Transaksi, jadi selalu muncul `RECON_NO_SUMMARY`. Template resmi (SCRUM-130) membawanya.

## Test
`src/lib/mapping/cashflow-checks.test.ts` (SCRUM-84/119)
