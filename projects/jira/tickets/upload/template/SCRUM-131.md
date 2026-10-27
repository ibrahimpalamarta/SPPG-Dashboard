# SCRUM-131: [DATA-051] Tolak template header-only
Fitur: upload/template | Tahap: 2 | Status: IN REVIEW (sebagian BLOCKED: B-TPLVER) | Terakhir diubah: 2026-10-27

## Yang sudah dikerjakan (`feature/tahap2-upload-parsers`)
- [x] Berkas dengan header tanpa baris data → `EMPTY_FILE`, staging batch dihapus (pipeline SCRUM-24), tidak ada canonical.
- [x] UI: badge **"Ditahan · file kosong"** (`StatusBadge` membaca `errorCode`) di hasil unggah dan Upload History; tombol **Unggah Ulang File** kembali ke langkah pilih file tanpa mengulang kitchen/jenis data.

## Sisa pekerjaan
- [ ] Mengenali "template resmi valid" (penanda versi, B-TPLVER → SCRUM-130). Sekarang semua berkas header-only diperlakukan sama.

## Test
`menu.test.ts` (header-only Menu Sukun → EMPTY_FILE, tidak ada staging).
