# SCRUM-66: [DATA-033] EFI Transfer event classification and Last Transfer KPI
Tahap: 7 | Status: IN_PROGRESS (siap review; definisi ASUMSI D-20) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `finance_transactions.is_efi_transfer` (adapter Cashflow, D-20): INSENTIF ke Yayasan Edufarmers. Dikeluarkan dari spend.
- [x] KPI: transfer terakhir (tanggal, nominal, referensi `txn_id`) + 5 terakhir.

## Sisa pekerjaan
- [ ] Konfirmasi arti "transfer EFI" dari Finance.

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
