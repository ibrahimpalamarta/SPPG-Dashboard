# SCRUM-48: [DATA-015] Vendor payment sequence and D0/D+1 SLA rules
Tahap: 5 | Status: IN_PROGRESS (siap review; sebagian BLOCKED: B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `classifySla` (`lib/mapping/payment-sla.ts`): received ≤ maker ≤ approval ≤ payment, lalu SAME_DAY / D_PLUS_1 / BREACH berdasarkan hari kalender WIB. Urutan terbalik = INVALID_SEQUENCE; langkah kosong = UNKNOWN (tidak pernah dianggap tepat waktu).
- [x] Kolom `vendor_payment_workflows.received_at` + `sla_status` (enum PaymentSla). Baris Input Maker tersimpan UNKNOWN karena sumbernya tidak membawa waktu langkah (OD-14).

## Sisa pekerjaan
- [ ] Waktu receipt/maker/approval/payment dari sumber nyata (Goods Receipt + log pembayaran, B-SRC-SKN), lalu issue untuk INVALID_SEQUENCE

## Test
`src/lib/mapping/cashflow-checks.test.ts` (SCRUM-48)
