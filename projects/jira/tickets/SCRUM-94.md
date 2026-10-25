# SCRUM-94: Mapping/schema mismatch handling
Tahap: 3 | Status: IN_PROGRESS | Terakhir diubah: 2026-10-26

## Yang sudah dikerjakan
- [x] File tidak dikenal tetap diblokir (`NEEDS_MAPPING_UPDATE`, tidak bisa READY/publish).
- [x] Response upload membawa `columnDiff`: per sheet `missing` (kolom profil yang tidak ada) dan `unexpected` (kolom yang tidak dikenal), dari kandidat terdekat.
- [x] `errorSummary` menyebut kolom yang hilang: "… Kolom tidak ditemukan: jumlah_baris."

## Test
`src/lib/mapping/detect.test.ts`, `src/controllers/upload/upload-batch.test.ts`
