# SCRUM-124: Layar sederhana file kolom berbeda
Tahap: 2 (setelah registry) | Status: IN_PROGRESS (sebagian BLOCKED: B-SCHEMA) | Terakhir diubah: 2026-10-26

## Yang sudah dikerjakan
- [x] Langkah 3 Unggah Data: tabel "Perbedaan kolom" (sheet, kolom tidak ditemukan, kolom tidak dikenal) + tombol "Unggah Ulang File". Tanpa Buat format baru / Tolak.
- [x] Unggah ulang mengirim `replaces=<publicId>` (zod uuid). Backend memvalidasi: batch ada, kitchen + domain sama, transisi ke FAILED sah. Setelah file baru berhasil di-parse, batch lama → `FAILED` + `errorCode: REPLACED`, audit `upload_batch.replaced`. Badge "Diganti".

## Sisa pekerjaan
- [ ] Status `SUPERSEDED` sungguhan butuh migrasi enum (B-SCHEMA); sementara FAILED + REPLACED.

## Test
`src/controllers/upload/upload-batch.test.ts`
