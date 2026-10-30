# SCRUM-103: Beneficiary aggregate widget
Tahap: 7 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Kotak "Penerima Manfaat / hari" di Overview: aktual (`perDay`) atau "Belum ada data"; rencana tidak tampil; tanpa PII.

## Sisa pekerjaan
- [ ] Target rencana di AI Insight (di luar lingkup).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
