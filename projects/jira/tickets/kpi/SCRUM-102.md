# SCRUM-102: EFI Transfer widget
Tahap: 7 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Kartu Transfer EFI Terakhir (tanggal/nominal/referensi) + tabel 5 transfer terakhir, tanpa label "Belum resmi"; stat di Overview.

## Sisa pekerjaan
- [ ] Definisi resmi setelah OD-03 (B-EFI); AI Insight pembayaran berulang (di luar lingkup).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
