# SCRUM-129: [DATA-049] Validate actual delivered segment total against displayed total
Tahap: 7 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `deliveredPortions`: baris sumber bersegmen "Total" dibandingkan dengan Σ segmen; selisih → status `MISMATCH`, kartu ditandai merah dan angka ditahan.

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
