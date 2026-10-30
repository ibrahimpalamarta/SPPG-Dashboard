# SCRUM-53: [DATA-020] Enforce missing data is not zero
Tahap: 4 | Status: IN_PROGRESS (siap review; sisa di Tahap 7/8) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Nilai kosong tetap NULL di semua tabel kanonik, dilaporkan sebagai MISSING_* (DQ-019).
- [x] RAB: baris tanpa Total Harga dihitung di `rab_daily_budgets.missing_line_totals`; `planned_cost` hanya Σ yang terbaca, dan KPI bisa menandainya tidak lengkap.
- [x] Cashflow: transaksi dengan jumlah baris kosong tidak dibandingkan ke total (tidak lagi memunculkan LINES_NOT_TOTAL palsu karena kosong dianggap 0).

## Sisa pekerjaan
- [ ] KPI membedakan 0 dan missing (Tahap 7); source hilang tampil di Data Health (Tahap 8)

## Test
`src/lib/mapping/sukun-rab.test.ts`
