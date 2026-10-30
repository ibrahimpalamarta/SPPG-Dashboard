# SCRUM-115: Top 5 Menu widget (periode 2 minggu & daerah)
Tahap: 7 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Widget Top 5 Menu + label periode di Overview; API menerima `?region=`.

## Sisa pekerjaan
- [ ] Pemilih periode/daerah di UI belum ada (API sudah mendukung).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
