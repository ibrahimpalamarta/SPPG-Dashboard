# Usulan skema — SCRUM-33/51/68 `validation_issues` + SCRUM-53 `rab_daily_budgets.missing_line_totals`

Status: **USULAN, sudah dimigrasi di branch** `feature/tahap4-validasi-dq` (migrasi `20261030010000_validation_issues`). Review PR = persetujuan.

## `validation_issues`
| Kolom | Tipe | Null | Catatan |
|---|---|---|---|
| `upload_batch_id` | UUID FK → upload_batches.public_id | tidak | ON DELETE CASCADE |
| `kitchen_id` | BIGINT | tidak | filter scope tanpa join |
| `code`, `rule_id` | TEXT | rule_id ya | kode adapter + DQ-xxx |
| `severity` | ENUM IssueSeverity (CRITICAL, HIGH, MEDIUM) | tidak | |
| `action` | ENUM IssueAction (REJECT, REVIEW, NORMALIZE, FLAG) | tidak | |
| `source_record_id` | TEXT | ya | NULL untuk issue tingkat transaksi |
| `message` | TEXT | tidak | |
| `status` | ENUM IssueStatus (OPEN, RESOLVED) | tidak | default OPEN |
| `note`, `resolved_by`, `resolved_at` | | ya | catatan wajib saat resolve |

Indeks: `(upload_batch_id, status, severity)` untuk gerbang karantina, `(kitchen_id, status, severity)` untuk antrean, `source_record_id`.

## `rab_daily_budgets.missing_line_totals` INT NOT NULL DEFAULT 0
Jumlah baris bahan tanpa Total Harga pada hari+segmen itu (missing ≠ 0).
