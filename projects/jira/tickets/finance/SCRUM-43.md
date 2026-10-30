# SCRUM-43: [DATA-010] Classify internal transfers separately from external spend
Tahap: 5 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `finance_transactions.is_internal_transfer`: tipe `ISI KAS KECIL`, `TRANSFER INTERNAL`, `PINDAH BUKU` (spasi/underscore dianggap sama).
- [x] `is_external_spend` = arah KELUAR **dan** bukan transfer internal. KPI spend (Top 5 Supplier, Komposisi Pengeluaran) hanya menjumlah yang true.
- [x] Test pasangan mutasi: isi kas kecil KELUAR + penerimaan kas kecil MASUK → keduanya bukan spend; belanja biasa tetap spend.

## Catatan
- Daftar tipe internal mengikuti Master Reference "Jenis transaksi" (Isi kas kecil). Nama tipe transfer EFI belum ada di sumber Sukun (lihat SCRUM-66).

## Test
`src/lib/mapping/cashflow-checks.test.ts` (SCRUM-43)
