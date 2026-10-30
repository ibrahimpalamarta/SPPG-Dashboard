# SCRUM-116: Informasi Gizi & Jumlah Tersalurkan widget
Tahap: 7 | Status: IN_PROGRESS (siap review; data tersalurkan B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Panel Informasi Gizi: porsi tersalurkan (atau "Belum ada data … bukan 0"), rencana vs tersalurkan per segmen, tabel gizi per porsi per segmen, catatan hari tidak lengkap.

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
