# SCRUM-73: [DATA-041] menu_recipe_line canonical transform
Tahap: 3 | Status: IN_PROGRESS (sebagian BLOCKED: B-MAPOUT, B-DD) | Terakhir diubah: 2026-10-26

## Yang sudah dikerjakan
- [x] `applySukunMenu` (`lib/mapping/sukun-menu.ts`): serving_date, kitchen, period, hari, menu_type, portion_segment, menu, bahan, berat kotor/bersih, BDD, URT, gizi (energi, protein, lemak, karbohidrat, serat), jumlah PM, kebutuhan kg/pax, harga, total, `source_record_id` (lineage).
- [x] Ejaan dirapikan: "Besar " / "kecil" / "kering" → "Besar" / "Kecil" / "Kering". Angka dibaca dua notasi: "Rp3,500", "1,212.00", "31,25".
- [x] Dedup key `serving_date|segmen|menu|bahan`: baris pertama dipakai, sisanya DUPLICATE_LINE.
- [x] Issue: DAY_MISMATCH (Hari ≠ tanggal), MISSING_VALUE (gizi/berat/PM/harga kosong), INVALID_DATE.
- [x] Rekonsiliasi lokal baseline asli (tidak di-commit): 4505 baris → 4476 line, 29 duplikat; Σ Total Harga Rp14.466.813.407 (sumber termasuk duplikat Rp14.469.408.257). 192 DAY_MISMATCH di 5 tanggal (31/03, 01/04, 02/04, 06/04, 29/05: nama hari bergeser), 1 protein kosong.

## Catatan
- Jumlah URT "46024" (kemungkinan pecahan yang berubah jadi serial tanggal di Excel) dibaca apa adanya, belum di-flag.

## Sisa pekerjaan
- [ ] Simpan hasil (B-MAPOUT); kunci dedup disepakati Data Steward

## Test
`src/lib/mapping/sukun-menu.test.ts`
