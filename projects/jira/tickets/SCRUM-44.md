# SCRUM-44: [DATA-011] Sukun RAB profile MAP-SKN-RAB-001
Tahap: 3 (label Jira: stage-4) | Status: IN REVIEW (sebagian BLOCKED: B-DD) | Terakhir diubah: 2026-10-27

## Yang sudah dikerjakan
- [x] Profil `MAP-SKN-RAB-001` v1 (DRAFT), kitchen SKN, domain `RAB`. Sumber = sheet "12" MASTER DATA MENU - SUKUN (kolom sama dengan MAP-SKN-MENU-001, `MENU_COLUMNS` dipakai bersama). Sheet tanpa Tanggal/Porsi/Bahan ("Form Menu Costing") dilewati.
- [x] Layout dirata: satu baris sumber = satu baris bahan; budget harian = (tanggal, segmen porsi) dengan `planned_cost` = Σ Total Harga.
- [x] Raw reference & lineage: tiap `rab_ingredient_budgets` membawa `source_record_id` ke baris di `staging_rows`.
- [x] Rekonsiliasi lokal dengan berkas asli (tidak di-commit): 4505 baris sheet "12" + 282 "Sheet2" → 250 budget harian; Σ planned_cost Rp14.460.268.392 = Σ Total Harga profil MENU pada berkas yang sama. Issue: 370 DAY_MISMATCH, 320 DUPLICATE_LINE (baris di "Sheet2" menduplikasi sheet "12"), 23 MISSING_VALUE, 22 INVALID_DATE, 22 MISSING_REQUIRED.

## Catatan
- Sesuai PRD §7.1/§7.2: `rab_daily_budgets` membawa traceability lengkap + `package_count` (terbesar dari Kebutuhan Makanan Kemasan pax); jumlah Penerima Manfaat (PM) tetap per baris bahan (`beneficiaries`), karena beneficiary_daily_count adalah dataset terpisah (planned vs actual).
- `Jumlah PM` di sheet "12" naik berurutan (84, 85, 86, …) seperti isian otomatis, bukan hitungan PM; perlu konfirmasi Data Steward sebelum dipakai sebagai porsi rencana (SCRUM-64).
- `Jumlah PM` di sheet "12" berisi angka berurutan (84, 85, 86, …); jumlah porsi tampak ada di `Kebutuhan Makanan Kemasan (pax)` (84 / 893). Disimpan mentah; aturan porsi rencana = SCRUM-64 (butuh keputusan Data Steward).

## Sisa pekerjaan
- [ ] Nama field kanonik [USULAN] (B-DD), profil ACTIVE setelah disetujui

## Test
`src/lib/mapping/sukun-rab.test.ts`, `src/lib/ingest/staging-prisma.test.ts`
