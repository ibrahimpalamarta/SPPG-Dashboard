# SCRUM-55: [DATA-022] Sukun Cashflow profile MAP-SKN-CF-001
Tahap: 3 | Status: IN REVIEW (sebagian BLOCKED: B-DD) | Terakhir diubah: 2026-10-27

## Yang sudah dikerjakan
- [x] Profil `MAP-SKN-CF-001` v1 (DRAFT) untuk layout flat `Transaksi_Kas` baseline Sukun. Versi mapping tersimpan di batch.
- [x] Rupiah titik ribuan ("Rp1.885.000"), harga tanpa Rp ("220000"), qty koma desimal ("16,45"), tanggal dd/mm/yyyy, satuan lower-case, tipe/arah upper-case.
- [x] Rekonsiliasi lokal dengan baseline asli (tidak di-commit): 2241 baris → 1009 transaksi; Σ total KELUAR Rp3.672.960.322 + MASUK Rp34.500.000 = Σ total sumber per txn_id (Rp3.707.460.322). Issue: 74 MISSING_AMOUNT, 37 NO_TXN_ID, 0 LINES_NOT_TOTAL, 0 TOTAL_INCONSISTENT.

## Catatan
- Layout template Kamus_Data (Transaksi_Kas + Rincian_Belanja terpisah) **bukan** layout profil ini; file seperti itu dikarantina dengan diff kolom sampai profilnya dibuat.

## Sisa pekerjaan
- [ ] Nama field kanonik (B-DD), profil ACTIVE setelah disetujui
