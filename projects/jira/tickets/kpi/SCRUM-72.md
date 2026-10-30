# SCRUM-72: [DATA-039] Enforce PII restriction for beneficiary data
Tahap: 7 | Status: IN_PROGRESS (siap review; registry restricted belum ada) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Dataset manajemen agregat by construction: tabel tanpa kolom NIK/nama/telepon/alamat; endpoint hanya mengirim agregat (test memastikan tidak ada kunci PII).
- [x] Angka penerima manfaat hanya untuk COST_ROLES (Ahli Gizi tidak menerima blok `portions`).

## Sisa pekerjaan
- [ ] `beneficiary_registry` restricted + log akses dibuat saat ada sumber per orang (belum ada, B-SRC-SKN).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
