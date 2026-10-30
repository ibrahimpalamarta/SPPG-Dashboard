# SCRUM-65: [DATA-032] Account Balance KPI behind source-of-truth configuration
Tahap: 7 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN, OD-02) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Membaca `finance_balances` published (saldo terakhir per rekening). Status `DRAFT` bila ada data, `UNAVAILABLE` bila tidak; tidak pernah resmi selama OD-02 terbuka.

## Sisa pekerjaan
- [ ] Selisih rekonsiliasi antar sumber menunggu sumber saldo nyata.

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
