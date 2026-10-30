# SCRUM-45: [DATA-012] Build Sukun PO mapping and stable IDs
Tahap: 3 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Tabel `purchase_order_lines` (migrasi `20261030000000_menu_recipe_line_purchase_order`): `po_id` + `po_line_id` unik per batch, label supplier/item mentah, qty/unit/harga, FK opsional `rab_ingredient_budget_id`, field traceability PRD §7.2. Usulan: `mapping/SCRUM-45-schema.md`.

## Catatan
- Tidak ada profil/adapter: berkas List PO / Nota Pesanan Sukun belum ada. Mapping tidak dikarang (B-SRC-SKN).

## Sisa pekerjaan
- [ ] Profil `MAP-SKN-PO-001` + adapter setelah sampel tersedia; aturan ID stabil (hash isi baris seperti `payment_request_id`) diuji dengan sampel
- [ ] Penanganan duplikat PO
