# Usulan skema — SCRUM-29/45 `purchase_order_lines`

Status: **USULAN, sudah dimigrasi di branch** `feature/tahap3-menu-recipe-line`. Belum ada writer (B-SRC-SKN).

| Kolom | Tipe | Null | Catatan |
|---|---|---|---|
| traceability PRD §7.2 | — | — | sama dengan `finance_transactions` |
| `po_id`, `po_line_id` | TEXT | tidak | ID stabil; UNIQUE `(upload_batch_id, po_id, po_line_id)` |
| `po_date` | DATE | ya | |
| `supplier_name`, `item_name` | TEXT | ya | label mentah sumber |
| `qty`, `unit`, `unit_price`, `line_amount` | DECIMAL/TEXT | ya | kosong = NULL |
| `rab_ingredient_budget_id` | BIGINT | ya | link opsional ke RAB (tanpa FK constraint sampai aturan pencocokan disepakati) |
