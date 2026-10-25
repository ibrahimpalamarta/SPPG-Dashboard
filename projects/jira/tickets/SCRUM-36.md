# SCRUM-36: [DATA-003] Menu Upload v1 staging parser
Tahap: 2 | Status: IN_PROGRESS (sebagian BLOCKED: B-SCHEMA) | Terakhir diubah: 2026-10-25

## Kondisi awal (hasil audit kode)
- `backend/src/lib/menu-workbook.ts` hanya dipakai dryRun MENU, header ditebak dari schema, sheet pertama saja.

## Kontrak (baseline MASTER DATA MENU Sukun, 23 kolom)
`<dapur>` (header berisi nama dapur, mis. "Sukun"), Periode, Tanggal, Hari, Menu Type, Porsi, Menu, Bahan, Berat Kotor (g), Berat Bersih (g), BDD (%), Jumlah URT, URT, Energi (kkal), Protein (g), Lemak (g), Karbohidrat (g), Serat (g), Jumlah PM, Kebutuhan Bahan (kg), Kebutuhan Makanan Kemasan (pax), Harga Bahan (Rp), Total Harga (Rp).

## Yang sudah dikerjakan
- [x] `menuParser` (`backend/src/lib/ingest/menu.ts`) terdaftar untuk `MENU`: sheet data dikenali dari header Tanggal + Porsi + Bahan; nama sheet ("12", bulan) tidak dipakai. Sheet lain `skipped` dengan alasan.
- [x] Periode tidak diwajibkan parser (PCK tanpa Periode → aturan metadata di profil, SCRUM-58).
- [x] Nilai mentah utuh: koma desimal "31,25", "1,212.00", URT `46024`, spasi "Besar ", huruf "kecil".
- [x] `menu-workbook.ts` dihapus; dryRun semua domain memakai `parseToStaging` ke repository sementara.
- [x] Fixture anonim `fixtures/sukun-menu.csv` (22 baris).

## Sisa pekerjaan
- [ ] Staging persisten (B-SCHEMA)
- [ ] Transform ke `menu_recipe_line` (SCRUM-31/73)

## Test
`src/lib/ingest/menu.test.ts`: jumlah baris = sumber; nilai mentah; sheet non-menu dilewati; header-only → EMPTY_FILE.
