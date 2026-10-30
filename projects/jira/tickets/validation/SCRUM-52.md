# SCRUM-52: [DATA-019] Shared normalization for date, currency, unit and decimal
Tahap: 4 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Tanggal: dd/mm/yyyy, dd-mm-yyyy, serial Excel, sel tanggal xlsx; tanggal mustahil (31/02) dan tahun < 2000 ditolak.
- [x] Rupiah/angka: "Rp1.885.000", "Rp3,500", "(1.000)".
- [x] Satuan: `normalizeUnit` di `lib/mapping/values.ts` (Kg/KG/Kilogram → kg, gr → g, Ltr → l, Pax/porsi → pax, buah/bh → pcs); satuan lain hanya di-lowercase, tidak ditebak. Tercatat sebagai `UNIT_NORMALIZED` di tab "Dirapikan otomatis".
- [x] Desimal koma/titik dibaca sama.

## Test
`src/lib/mapping/values.test.ts` (SCRUM-52 shared normalisation)
