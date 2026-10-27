# SCRUM-123: Tampilan bersih, data Rencana disembunyikan, Data Reference hanya diubah PM
Fitur: access/app-shell | Tahap: 1 | Status: IN_PROGRESS (sebagian BLOCKED: B-PLAN) | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- Subjudul kecil di bawah judul halaman Overview, Finance, Kelengkapan Data, Unggah Data, Peran & Izin.
- Data Reference: catatan kaki menyebut "PRD §14"/"BRD", tanpa Alur Data, tanpa tombol Ubah. Tulis master `ingredients` bisa dilakukan DATA_ADMIN (diperbaiki di SCRUM-20).
- Tidak ada biaya/penerima rencana maupun label "Rencana" di dashboard (grep `rencana|planned` di `components/` & `app/`: kosong).

## Yang sudah dikerjakan (feature/scrum-123-clean-ui)
- [x] Subjudul kecil dihapus dari 5 halaman (judul halaman tetap)
- [x] Data Reference: catatan teknis PRD/BRD dihapus; nama teknis tidak tampil (label Indonesia, enum → label)
- [x] Section **Alur Data** 5 langkah: Unggah file → Mapping kolom → Validasi data → Review PM → Publish ke dashboard
- [x] Tombol **Ubah** per dapur (nama, status) hanya muncul bila role punya `reference:edit` (PM MBG); server action `PATCH /api/kitchens/:id`, backend menolak role lain (403, SCRUM-20)
- [x] Rencana: tidak ada yang tampil di dashboard; data RAB/penerima rencana di backend tidak disentuh
- [x] Kartu "Informasi Gizi" berlabel sesuai tiket
- [x] Halaman Data Reference berisi tab (Kamus data dst., `?tab=`) dengan pencarian; isi kamus dari `lib/mock/referensi-data.ts` (statis, bukan data operasional) (9cbd0f8)

## Sisa pekerjaan
- [ ] B-PLAN: konfirmasi Product bahwa "Rencana disembunyikan" mengalahkan PRD AC-DASH-01 (Planned Cost per Portion, SCRUM-64/100). Widget itu belum dibangun; keputusan dibutuhkan sebelum T24.

## Acceptance criteria
- [x] Subjudul kecil hilang
- [x] Biaya/penerima rencana tidak tampil di dashboard, tetap ada di backend
- [x] Data Reference tanpa nama teknis, punya Alur Data 5 langkah, tombol Ubah hanya untuk PM

## Test
- Frontend lint, knip, `tsc`, build bersih.
- Render lokal (build produksi :3002 + backend branch :8090, sesi nyata): PM → Alur Data tampil, tombol Ubah ada; Data Operasional → Alur Data tampil, tombol Ubah tidak ada; catatan PRD §14 hilang; subjudul Overview hilang. `PATCH /api/kitchens/1`: PM 200, Data Operasional 403.

## Blocker / pertanyaan terbuka
- B-PLAN

## Skema
- Tidak ada.
