# SCRUM-62: [DATA-029] Build Top 5 Supplier semantic query
Tahap: 7 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `financeKpi` (`backend/src/lib/kpi.ts`): Σ `line_amount` per supplier (nama dilipat huruf/spasi), hanya transaksi `is_external_spend` (tanpa transfer internal, kas kecil, EFI), TERKONFIRMASI, batch PUBLISHED, tidak superseded.
- [x] Tidak pernah memakai `txn_total` per baris (anti-double-count). Baris tanpa nominal tidak dihitung sebagai Rp0.

## Sisa pekerjaan
- [ ] Belum ada master supplier (`supplier_id`); pengelompokan memakai nama ternormalisasi.

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
