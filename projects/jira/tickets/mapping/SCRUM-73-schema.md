# Usulan skema — SCRUM-31/73 `menu_recipe_lines`

Status: **USULAN, sudah dimigrasi di branch** `feature/tahap3-menu-recipe-line` (migrasi `20261030000000_menu_recipe_line_purchase_order`). Review PR = persetujuan.

Satu baris per bahan menu dari MAP-SKN-MENU-001, dihapus-lalu-ditulis per batch (pola sama dengan `finance_transactions`).

| Kolom | Tipe | Null | Sumber |
|---|---|---|---|
| `upload_batch_id`, `mapping_profile_id`, `kitchen_id`, `source_record_id`, `source_system`, `source_file_name`, `template_version`, `loaded_at` | — | sesuai PRD §7.2 | Traceability |
| `period`, `serving_date`, `menu_type`, `portion_segment`, `menu_name`, `ingredient`, `urt_unit`, `urt_qty` | TEXT/DATE/DECIMAL | ya | Kolom form menu |
| `gross_weight_g`, `net_weight_g`, `edible_portion_pct`, `energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `fiber_g` | DECIMAL | ya | Gizi per bahan; kosong = NULL (DQ-019) |
| `planned_portions` | DECIMAL | ya | "Jumlah Penerima Manfaat" form menu = porsi **rencana** |
| `ingredient_need_kg`, `packaged_need_pax`, `unit_price`, `line_total` | DECIMAL | ya | Kebutuhan & harga |

Indeks: `(kitchen_id, serving_date)` untuk KPI menu/gizi, `upload_batch_id`, `source_record_id`.

**Rujukan.** PRD §7.1 (dataset menu_recipe_line), B-MAPOUT (disimpan saat upload). Nama kolom: K-03 (TODO B-DD).
