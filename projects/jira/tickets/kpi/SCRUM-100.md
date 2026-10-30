# SCRUM-100: Planned Cost per Portion widget
Tahap: 7 | Status: IN_PROGRESS (siap review; B-PLAN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Kartu "Biaya per Porsi · Rencana/RAB" di Finance & Cost, hanya muncul bila flag aktif.

## Sisa pekerjaan
- [ ] Aturan alokasi per segmen belum ada (satu angka per dapur/periode).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
