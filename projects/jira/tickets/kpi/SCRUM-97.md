# SCRUM-97: Top 5 Supplier widget
Tahap: 7 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Overview + Finance & Cost membaca `GET /api/kpi/finance` (`components/overview/top-suppliers.tsx`, `components/finance/supplier-expense.tsx`), dengan nilai + persentase dan keadaan kosong "Belum ada data belanja yang dipublish".

## Sisa pekerjaan
- [ ] Drill-down "Lacak Sumber" ke baris sumber menunggu SCRUM-105 (Tahap 8).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
