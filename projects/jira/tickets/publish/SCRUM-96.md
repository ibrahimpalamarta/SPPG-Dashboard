# SCRUM-96: Correction/supersede flow
Tahap: 6 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Unggah dengan `replaces` = batch PUBLISHED kini diterima: batch lama **tetap PUBLISHED** (data lama masih tampil), batch baru menyimpan `replaces_batch_id`.
- [x] Saat koreksi dipublish, batch lama → SUPERSEDED (`errorCode REPLACED`, "Dikoreksi oleh batch …"). Transisi PUBLISHED → SUPERSEDED hanya lewat jalur ini (PATCH tidak bisa memintanya).
- [x] Histori tidak hilang: baris batch lama tetap ada, ditandai superseded per kunci bisnis (SCRUM-78), dan batch lama tetap terbaca di riwayat.

## Test
`src/controllers/upload/upload-batch.test.ts` (koreksi batch published), `src/controllers/upload/review.test.ts`, `src/lib/upload-status.test.ts`
