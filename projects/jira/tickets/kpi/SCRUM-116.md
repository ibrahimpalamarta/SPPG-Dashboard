# SCRUM-116: Informasi Gizi & Jumlah Tersalurkan widget
Tahap: 7 | Status: IN_PROGRESS (siap review; data tersalurkan B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Panel Informasi Gizi: hanya porsi tersalurkan aktual (atau "Belum ada data … bukan 0"), rincian per segmen = total (ditahan bila MISMATCH), tabel gizi per porsi per segmen, catatan hari tidak lengkap.

## Sisa pekerjaan
- [ ] Pemilih periode & dapur di UI (API sudah menerima kitchenId/dateFrom/dateTo).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
