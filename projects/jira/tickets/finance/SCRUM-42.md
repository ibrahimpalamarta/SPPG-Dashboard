# SCRUM-42: [DATA-009] Normalize expense categories using Master Reference
Tahap: 5 | Status: IN_PROGRESS (siap review; sebagian BLOCKED: B-DD) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Kategori mentah tetap di `finance_transactions.category`; `category_normalized` diisi dari Data Reference › Daftar Kode › "Kategori pengeluaran" (bisa diubah PM tanpa deploy), dicocokkan `loose` ("Insentif Fasilitas" = "Insentif & Fasilitas").
- [x] Kategori yang tidak termapping: `category_normalized` NULL + issue `UNMAPPED_CATEGORY` (MEDIUM/FLAG, satu per label). Tidak ditebak.
- [x] `lib/mapping/cashflow-checks.ts` `normalizeCategories`, dipanggil pipeline untuk CASHFLOW.

## Catatan
- Daftar kategori di seed bertanda "Perlu disetujui Finance"; daftar final mengikuti Data Dictionary v0.2 (B-DD).

## Test
`src/lib/mapping/cashflow-checks.test.ts`
