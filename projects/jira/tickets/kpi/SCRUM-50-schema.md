# Usulan skema — Tahap 7 KPI

Status: **USULAN, sudah dimigrasi di branch** `feature/tahap7-kpi-dashboard` (migrasi `20261030040000_kpi_tahap7`). Review PR = persetujuan.

| Tabel | Kolom | Tipe | Tiket |
|---|---|---|---|
| `finance_transactions` | `is_efi_transfer` | BOOLEAN NOT NULL DEFAULT false | SCRUM-66 |
| `finance_balances` | `superseded_by_batch_id` | UUID NULL | SCRUM-78 |

## `beneficiary_daily_counts` (SCRUM-50/72, tanpa writer)
Traceability PRD §7.2 + `count_date` DATE, `location_ref` TEXT (titik salur, bukan orang), `segment` TEXT, `planned_count` INT NULL, `actual_count` INT NULL, `superseded_by_batch_id` UUID NULL. UNIQUE `(upload_batch_id, count_date, location_ref, segment)`. **Tidak ada kolom PII.**
