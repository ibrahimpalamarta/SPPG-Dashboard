# SCRUM-41: Anti-double-count repeated transaction total
Tahap: 4 | Status: IN REVIEW | Terakhir diubah: 2026-10-28

## Yang sudah dikerjakan
- [x] `txn_total` hanya ada di `finance_transactions` (satu per transaksi); `finance_transaction_lines` tidak punya kolom total, jadi SUM per baris tidak bisa mengulang total.
- [x] Regression test (`sukun-cashflow.test.ts`): BELANJA 3 baris, total sumber diulang di tiap baris → total KELUAR = 327.000, bukan 3 × 327.000; header total = Σ line_amount.
- [x] Total yang berbeda antar baris satu transaksi dilaporkan `TOTAL_INCONSISTENT` (DQ-004).
