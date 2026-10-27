# SCRUM-124: Layar sederhana file kolom berbeda
Fitur: upload/ui | Tahap: 2 (setelah registry) | Status: IN REVIEW | Terakhir diubah: 2026-10-27

## Yang sudah dikerjakan
- [x] Langkah 3 Unggah Data: tabel "Perbedaan kolom" (sheet, kolom tidak ditemukan, kolom tidak dikenal) + tombol "Unggah Ulang File". Tanpa Buat format baru / Tolak.
- [x] Unggah ulang mengirim `replaces=<publicId>` (zod uuid). Backend memvalidasi: batch ada, kitchen + domain sama, transisi ke FAILED sah. Setelah file baru berhasil di-parse, batch lama → `SUPERSEDED` + `errorCode: REPLACED`, audit `upload_batch.replaced`. Badge "Diganti".

## Sisa pekerjaan
- [x] Status `SUPERSEDED` sungguhan: enum dimigrasi 2026-10-26 (`20261026000000_staging_rows`); transisi sah dari `NEEDS_MAPPING_UPDATE`.
- Tidak ada.

## Test
`src/controllers/upload/upload-batch.test.ts`
