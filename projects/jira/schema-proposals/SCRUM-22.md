# Usulan skema — SCRUM-22 + SCRUM-37 (upload batch)

Status: **SUDAH TERMIGRASI di branch lokal `feature/scrum-22-upload-batch`, menunggu approval** (D-01, B-SCHEMA).
Migrasi: `backend/prisma/migrations/20261022010000_upload_batch_metadata/migration.sql`.

`upload_batches` sudah ada di develop (ERD). Kolom yang **[PRD]** (FR-UP-02/03/05/06, §7.2), tidak butuh approval:
`public_id` (= `upload_batch_id`), `kitchen_id`, `domain`, `source_system`, `file_name` (= `source_file_name`), `uploader_id`, `upload_date`, `status`, `mapping_profile_id`, `template_version`.
Enum `UploadStatus` (FR-UP-05 + `NEEDS_MAPPING_UPDATE` dari AC-UP-03), `UploadDomain`, dan `SourceSystem` (§7.2) juga [PRD].

## Kolom [USULAN] yang ikut termigrasi

| Kolom | Tipe | Null | Alasan | Rujukan | Alternatif tanpa kolom |
|---|---|---|---|---|---|
| `file_hash` | TEXT, index (tidak UNIQUE lagi) | tidak | Peringatan "File identik sudah pernah diupload (batch X)"; dasar `source_record_id` deterministik | NFR-05, prompt §Tahap 2 | Sudah ada di develop (ERD, dulu UNIQUE). Yang berubah hanya UNIQUE → index. |
| `file_size` | INT | ya | Ditampilkan di halaman Upload (SCRUM-5) | FR-UP-01 | Ambil dari metadata S3 (HEAD) saat dibutuhkan |
| `storage_key` | TEXT | ya | Unduh berkas asli (SCRUM-25); kunci S3 tidak boleh memuat nama asli | FR-UP-02 "file tersimpan" | Turunkan dari `public_id` (`upload-batches/<publicId>.xlsx`), karena memang itu polanya. Kolom bisa dihapus bila disetujui. |
| `period` | TEXT `YYYY-MM` | ya | PRD §4.1 langkah 1: "periode jika dibutuhkan" | PRD §4.1 | — |
| `error_code`, `error_summary` | TEXT | ya | Pesan gagal yang actionable dan event `upload_failed.error_code` | NFR-08, PRD §11.1 | Simpan di `notes` (teks bebas, tidak bisa di-filter) |
| `duration_ms` | INT | ya | Properti event `upload_completed.duration` | PRD §11.1 | Hanya di log event, tidak di DB |
| `validated_at`, `published_at` | TIMESTAMP | ya | "publish timestamp" disimpan di batch | PRD §6.4, FR-UP-06 / P1-005 | — (`published_at` praktis [PRD] via §6.4) |
| `row_count` | INT default 0 | tidak | Sudah ada di develop (ERD); hanya diberi default | — | — |

Index tambahan: `(kitchen_id, domain, upload_date)` untuk filter history (SCRUM-25).

**Yang diminta dari reviewer:** setujui per baris, atau tandai kolom yang harus dihapus. Kolom yang ditolak akan dihapus lewat migrasi baru, bukan dengan mengedit migrasi lama.
