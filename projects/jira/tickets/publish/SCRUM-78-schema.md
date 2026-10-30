# Usulan skema — Tahap 6 publish & lineage

Status: **USULAN, sudah dimigrasi di branch** `feature/tahap6-publish-lineage` (migrasi `20261030030000_publish_lineage`). Review PR = persetujuan.

| Tabel | Kolom | Tipe | Tiket |
|---|---|---|---|
| `finance_transactions`, `rab_daily_budgets`, `menu_recipe_lines`, `vendor_payment_workflows` | `superseded_by_batch_id` | UUID NULL | SCRUM-78 |
| `upload_batches` | `replaces_batch_id` | UUID NULL | SCRUM-96 |

## `government_submission_logs` (SCRUM-59/107)
| Kolom | Tipe | Null |
|---|---|---|
| `kitchen_id` | BIGINT | tidak |
| `system` | ENUM GovernmentSystem (SIPGN, POP, AKSIS) | tidak |
| `module` | TEXT | tidak |
| `source_record_id` | TEXT | tidak |
| `status` | ENUM SubmissionStatus (SUBMITTED, ACCEPTED, REJECTED) | tidak |
| `submitted_at` | TIMESTAMP | tidak |
| `external_ref`, `note` | TEXT | ya |
| `recorded_by` | BIGINT FK users | ya |

UNIQUE `(system, module, source_record_id)`; indeks `(kitchen_id, submitted_at)`, `source_record_id`.
