# SCRUM-22 + SCRUM-37: Create upload batch & common metadata
Fitur: upload/batch | Tahap: 2 | Status: IN REVIEW (sebagian BLOCKED: B-SCHEMA, B-ASSIGN) | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- Branch `feature/scrum-22-upload-batch` (commit `eb53f4b`, 22 Okt, lokal, bertumpu pada SCRUM-20).
- Di develop: `upload_batches` versi ERD (status DITERIMA/DITOLAK/PROCESSING, `file_hash` UNIQUE), dan upload langsung menulis `menu_plans`.

## Yang sudah dikerjakan
- [x] Enum `UploadStatus` FR-UP-05: PROCESSING, NEEDS_REVIEW, NEEDS_MAPPING_UPDATE, READY, PUBLISHED, FAILED, SUPERSEDED (SUPERSEDED ditambah 2026-10-26, migrasi `20261026000000_staging_rows`; data lama: diterima → PUBLISHED, ditolak → FAILED)
- [x] Enum bersama `UploadDomain`, `SourceSystem` — `schema.prisma`
- [x] Kolom metadata baru (lihat proposal) + index `(kitchen_id, domain, upload_date)` dan `file_hash`
- [x] State machine `canTransition()` — `backend/src/lib/upload-status.ts`; transisi ilegal → 409 `invalid_transition`
- [x] Unggah ulang berkas identik = batch baru + `warning.code = DUPLICATE_FILE`
- [x] Upload tidak lagi menulis `menu_plans`; berkas disimpan ke S3 `upload-batches/<publicId>.xlsx`; gagal simpan → FAILED `STORAGE_FAILED`
- [x] Validasi ekstensi `.xlsx` + magic bytes zip (`.xlsm` ditolak), scope kitchen, `period` `YYYY-MM`
- [x] `trackEvent()` untuk `upload_started` / `upload_completed` / `upload_failed` — `backend/src/lib/events.ts`
- [x] Postman collection + README backend diperbarui

## Sisa pekerjaan
- [x] "Batch ID muncul di history": tabel history nyata (SCRUM-25).
- [x] "Menjadi parent baris staging": `staging_rows.upload_batch_id` → `upload_batches.public_id` (FK, ON DELETE CASCADE) (SCRUM-24).
- [ ] Approval skema kolom `upload_batches` di luar [PRD] (B-SCHEMA), assignee (B-ASSIGN).

## Acceptance criteria
- [x] Batch ID unik per attempt (UUID `public_id`)
- [x] Muncul di history (UI SCRUM-25)
- [x] Menjadi parent baris staging (SCRUM-24)
- [x] Transisi ilegal ditolak, scope ditolak (test)

## Test
- 22 Okt: batch dibuat dengan metadata lengkap, duplikat → warning, S3 gagal → FAILED, berkas bukan zip ditolak, kitchen tak dikenal → 400, scope ditolak, transisi ilegal ditolak, transisi sah dicatat. Total 109 lulus.

## Keterbatasan yang diketahui (jangan disembunyikan di UI)
- Batch tanpa profil yang cocok berakhir `NEEDS_MAPPING_UPDATE` (`PROFILE_NOT_DETECTED`); satu profil cocok → `NEEDS_REVIEW` (SCRUM-39).
- Mengubah status batch butuh `batch:review` (hanya PM MBG); sebelumnya Data Admin bisa.
- Preview `?dryRun=true` semua domain memakai parser staging (SCRUM-36); `menu-workbook.ts` sudah dihapus.
- Domain mana yang **wajib** periode belum diputuskan (opsional untuk semua).

## Blocker / pertanyaan terbuka
- B-SCHEMA, B-ASSIGN

## Skema
- [PRD] kolom traceability + enum status/domain/source
- [USULAN, sudah termigrasi] lihat `SCRUM-22-schema.md`
