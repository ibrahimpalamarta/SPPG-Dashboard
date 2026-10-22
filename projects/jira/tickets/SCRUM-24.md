# SCRUM-24: Excel upload pipeline
Tahap: 2 | Status: IN_PROGRESS | Terakhir diubah: 2026-10-23 10:00

## Kondisi awal (hasil audit kode)
- Ada: endpoint multipart `POST /api/upload-batches` (multer memory, `UPLOAD_MAX_BYTES` default 10 MB), cek ekstensi + magic bytes zip, simpan ke S3 (`src/lib/s3.ts`), pembuatan batch (SCRUM-22).
- Belum ada: parser generik semua sheet, parser registry per domain, staging, finalize status, re-parse idempoten.
- `src/lib/menu-workbook.ts`: parser lama khusus MENU dengan header tebakan (bukan dari sampel), dipakai hanya untuk `?dryRun=true`.
- Library xlsx: `exceljs` ^4.4 (sudah terpasang).

## Yang sudah dikerjakan
- [x] Langkah 1 (endpoint multipart + batas ukuran) — sudah ada sejak SCRUM-5/22

## Sisa pekerjaan
- [ ] Langkah 2–7

## Acceptance criteria
- [ ] FR-UP-02 (xlsx diterima, tersimpan dengan metadata) — sebagian
- [ ] FR-UP-04 / AC-UP-03 schema tidak dikenal tidak di-publish

## Test
- (belum)

## Blocker / pertanyaan terbuka
- B-SCHEMA (staging), B-DD

## Skema
- Staging `finance_txn_upload`, `menu_recipe_upload` = [PRD] (nama dataset). Kolom bantu = [USULAN].
