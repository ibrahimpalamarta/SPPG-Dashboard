# SCRUM-85: [DATA-047] Implement latest Menu DQ rules across kitchen templates
Tahap: 4 | Status: IN_PROGRESS (Sukun siap review; dapur lain di luar lingkup) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan (Sukun)
- [x] Periode kosong → MISSING_REQUIRED (DQ-008); koma desimal dibaca (`parseNumber`); sheet/baris duplikat → DUPLICATE_LINE (kunci tidak memuat nama sheet, jadi sheet ganda ikut terdeteksi).
- [x] Plausibilitas: IMPLAUSIBLE_VALUE (negatif, BDD di luar 0–100), di-flag, tidak dikoreksi.
- [x] Baru: URT_LOOKS_LIKE_DATE, untuk Jumlah URT berupa serial tanggal Excel (kasus nyata "46024"), di-flag MEDIUM.
- [x] Severity per rule terdaftar di `lib/validation/rules.ts`.

## Catatan
- Provenance harga AI/inferred: template Sukun tidak punya kolom sumber harga, jadi tidak ada yang bisa di-flag.

## Sisa pekerjaan
- [ ] Rule PCK (periode eksplisit), DNM (label maternal), SML (multi-ingredient + kelengkapan), LWG (gizi/harga kosong): butuh profil dapur tersebut (SCRUM-58)

## Test
`src/lib/mapping/sukun-menu.test.ts`
