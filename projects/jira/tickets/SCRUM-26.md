# SCRUM-26: Mapping Profile Registry service/config
Tahap: 3 | Status: IN_PROGRESS (sebagian BLOCKED: B-REG, B-DD) | Terakhir diubah: 2026-10-26

## Yang sudah dikerjakan
- [x] `backend/src/lib/mapping/profiles.ts`: tipe `MappingProfile` (id, version, status DRAFT/ACTIVE, kitchenCode, domain, sourceSystem, `columns` field kanonik → header sumber, `apply`) + `PROFILES`.
- [x] Default B-REG dipakai: registry = file konfigurasi di repo, direview seperti kode.
- [x] Profil: `MAP-SKN-CF-001` (17 kolom Transaksi_Kas flat), `MAP-SKN-MENU-001` (23 kolom Master Data Menu). Tidak ada percabangan nama dapur.

## Sisa pekerjaan
- [ ] Konfirmasi B-REG (config vs tabel)
- [ ] Nama field kanonik [USULAN] sampai kamus data disetujui (B-DD); status profil tetap DRAFT

## Test
`src/lib/mapping/detect.test.ts`
