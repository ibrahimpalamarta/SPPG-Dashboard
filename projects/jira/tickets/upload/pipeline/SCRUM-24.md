# SCRUM-24: Excel upload pipeline
Fitur: upload/pipeline | Tahap: 2 | Status: IN REVIEW | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- Ada: endpoint multipart `POST /api/upload-batches` (multer memory, `UPLOAD_MAX_BYTES` 10 MB), cek magic bytes zip, simpan ke S3, pembuatan batch (SCRUM-22).
- Belum ada: parser semua sheet, registry parser per domain, staging, finalize status, re-parse idempoten.
- `src/lib/menu-workbook.ts`: parser lama khusus MENU (header tebakan), hanya untuk `?dryRun=true`. Library: `exceljs` ^4.4.

## Yang sudah dikerjakan
- [x] Langkah 1: multipart + batas ukuran (sudah ada)
- [x] Langkah 2: `readWorkbook()` membaca semua sheet sesuai urutan; formula → hasil + teks formula; tanggal → ISO + serial Excel; merged → `mergedFrom`; tidak ada normalisasi. `detectHeaderRow()` heuristik dengan opsi `scanRows`/`minColumns`; header mentah disimpan per sheet — `src/lib/ingest/workbook.ts`
- [x] Langkah 3: `parseToStaging()` + `registerParser(domain, parser)`; domain tanpa parser memakai `rawParser` (staging mentah generik) — `src/lib/ingest/pipeline.ts`. Alur controller: batch → cek container → S3 → parse → finalize
- [x] Langkah 5: korup (`CORRUPT_FILE`), password/OLE (`ENCRYPTED_FILE`), bukan xlsx (`NOT_XLSX`), tanpa baris data (`EMPTY_FILE`) → batch `FAILED` + pesan Bahasa Indonesia; tidak ada staging tersisa. Berkas yang bukan container xlsx **tidak** disimpan ke S3
- [x] Langkah 6: `replaceBatch()` hapus-lalu-isi, sehingga re-parse idempoten
- [x] `source_record_id` = `{kitchen}:{domain}:{hash[:12]}:{sheet}:{row}` (deterministik)
- [x] Respons upload memuat `sheets` (nama, urutan, baris header, header, jumlah baris)
- [x] Event: batch FAILED → `upload_failed` dengan `error_code`, selain itu `upload_completed`

## Perubahan perilaku
- Sebelumnya berkas bukan zip → 400 tanpa batch. Sekarang → 201 dengan batch `FAILED` (`NOT_XLSX`), karena setiap percobaan mendapat batch ID (FR-UP-03, langkah 5 tiket). `?dryRun=true` tetap 400.

## Sisa pekerjaan
- [ ] Langkah 4 (asinkron): tetap sinkron dalam request, mengikuti pola repo (batas 10 MB). Ditandai `ponytail:` di controller; pindah ke queue bila berkas nyata timeout di ALB.
- [x] Staging persisten: tabel generik `staging_rows` (Pilihan A, B-RAW tertutup), `PrismaStagingRepository` di `staging.ts`, ditambah SUPERSEDED (6a6d2dc, 2026-10-26). `upload_sheets` ditunda
- [ ] `template_version` dibaca dari sel metadata template (SCRUM-130)

## Acceptance criteria
- [x] FR-UP-02: xlsx diterima dan disimpan dengan metadata
- [x] FR-UP-04 / AC-UP-03: schema tidak dikenal tidak di-publish (selalu `NEEDS_MAPPING_UPDATE` sampai SCRUM-39)
- [x] Staging menjadi parent baris yang persisten (`staging_rows`)

## Test
- `src/lib/ingest/pipeline.test.ts`: multi-sheet + baris judul di atas header, nilai mentah ("Rp12,000" utuh, formula, tanggal + serial 46296, merged), kosong ≠ 0, `source_record_id` deterministik, re-parse mengganti, workbook kosong → `EMPTY_FILE`.
- `upload-batch.test.ts`: bukan xlsx → FAILED `NOT_XLSX` tanpa S3; OLE → `ENCRYPTED_FILE`; zip korup → `CORRUPT_FILE` tanpa staging; xlsx valid → ter-staging, `rowCount` = 1, `sheets` di respons.
- Backend 125/125 lulus, `tsc` bersih.

## Blocker / pertanyaan terbuka
- B-SCHEMA (persetujuan skema `staging_rows`)

## Skema
- [PRD] field traceability §7.2 (di `StagingRow`)
- [USULAN, sudah termigrasi] wadah staging `staging_rows` → `SCRUM-24-schema.md`

## Update 2026-10-25 — CSV (`feature/tahap2-upload-parsers`)
- [x] `.csv` diterima (`singleFile` + `readWorkbook(buffer, fileName)`): dibaca exceljs dengan map identitas, jadi setiap sel tetap string apa adanya ("Rp1.885.000", "16,45", "22/02/2026"). BOM dibuang; berkas biner/kosong → `CORRUPT_FILE`.
- [x] Nama sheet CSV dari tab Google Sheets ("… - Transaksi_Kas.csv" → `Transaksi_Kas`); kosmetik, parser memakai header.
- [x] Key S3 `upload-batches/<publicId>.csv`, `Content-Type: text/csv`.
- Test: `src/lib/ingest/workbook.test.ts`, test CSV di `upload-batch.test.ts`.
