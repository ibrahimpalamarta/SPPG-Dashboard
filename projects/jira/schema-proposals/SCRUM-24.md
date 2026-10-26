# Usulan skema — SCRUM-24 (staging baris mentah)

Status: **DIMIGRASI (Pilihan A, 2026-10-26, `20261026000000_staging_rows`; `upload_sheets` ditunda).** Teks di bawah = usulan awal. Sementara `InMemoryStagingRepository` (`backend/src/lib/ingest/staging.ts`): baris staging hilang saat restart dan tidak dibagi antar task ECS. Batch (status, `row_count`) tetap di Postgres, berkas asli tetap di S3.

## Pilihan A (direkomendasikan): satu tabel generik `staging_rows`

| Kolom | Tipe | Null | Sumber |
|---|---|---|---|
| `upload_batch_id` | UUID FK → `upload_batches.public_id` ON DELETE CASCADE | tidak | [PRD] §7.2 |
| `source_record_id` | TEXT UNIQUE | tidak | [PRD] §7.2 |
| `kitchen_id` | BIGINT FK | tidak | [PRD] §7.2 |
| `source_system` | enum `SourceSystem` | tidak | [PRD] §7.2 |
| `source_file_name` | TEXT | tidak | [PRD] §7.2 |
| `template_version` | TEXT | ya | [PRD] §7.2 |
| `mapping_profile_id` | TEXT | ya | [PRD] §7.2 |
| `loaded_at` | TIMESTAMP | tidak | [PRD] §7.2 |
| `domain` | enum `UploadDomain` | tidak | [USULAN] (pembeda dataset) |
| `sheet_name` | TEXT | tidak | [USULAN] |
| `source_row_number` | INT | tidak | [USULAN] |
| `raw_values` | JSONB (huruf kolom → `{value,type,formula?,dateSerial?,mergedFrom?}`) | tidak | [USULAN] |

Plus `upload_sheets` (`upload_batch_id`, `name`, `index`, `header_row`, `headers JSONB`, `row_count`) untuk deteksi profil (SCRUM-39) tanpa membaca ulang berkas.

**Alasan.** Satu wadah melayani semua domain, termasuk RAB/PO/Payment/GR yang tidak punya tiket staging (B-RAW). `finance_txn_upload` dan `menu_recipe_upload` di PRD §7.1 bisa menjadi **view** di atas tabel ini (`WHERE domain = 'CASHFLOW'` / `'MENU'`), sehingga nama dataset PRD tetap ada.

## Pilihan B: tabel per dataset PRD
`finance_txn_upload`, `menu_recipe_upload` (+ `input_maker_upload`, dst.) dengan kolom traceability yang sama + `raw_values`. Lebih dekat ke nama PRD, tapi butuh tabel baru per domain dan Data Dictionary v0.2 untuk kolom tipenya (B-DD).

**Yang diminta:** pilih A atau B. Kontrak `StagingRepository` sama untuk keduanya; hanya implementasinya yang diganti.
