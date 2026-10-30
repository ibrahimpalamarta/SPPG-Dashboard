# Usulan skema — Tahap 5 finance kanonik

Status: **USULAN, sudah dimigrasi di branch** `feature/tahap5-finance-canonical` (migrasi `20261030020000_finance_canonical_tahap5`). Review PR = persetujuan.

## Kolom baru
| Tabel | Kolom | Tipe | Tiket |
|---|---|---|---|
| `finance_transactions` | `category_normalized` | TEXT NULL | SCRUM-42 |
| `finance_transactions` | `is_internal_transfer` | BOOLEAN NOT NULL DEFAULT false | SCRUM-43 |
| `vendor_payment_workflows` | `received_at` | TIMESTAMP NULL | SCRUM-48 |
| `vendor_payment_workflows` | `sla_status` | ENUM PaymentSla (SAME_DAY, D_PLUS_1, BREACH, INVALID_SEQUENCE, UNKNOWN) DEFAULT UNKNOWN | SCRUM-48 |

## `goods_receipt_lines` (SCRUM-46, tanpa writer)
Traceability PRD §7.2 + `receipt_id`, `receipt_line_id` (UNIQUE per batch), `received_at`, `po_id`, `po_line_id`, `item_name`, `unit`, `ordered_qty`, `received_qty`, `qty_match_status` (MATCH/SHORT/OVER), `source_flag`.

## `finance_balances` (SCRUM-49, tanpa writer)
Traceability PRD §7.2 + `balance_date` DATE, `account_ref` TEXT (label rekening, bukan nomor), `balance` DECIMAL(16,2) NULL. UNIQUE `(upload_batch_id, balance_date, account_ref)`; satu saldo per dapur × tanggal × rekening lintas batch ditegakkan saat publish.
