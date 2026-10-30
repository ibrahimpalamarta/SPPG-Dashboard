# SCRUM-31: Menu common adapter MAP-SKN-MENU-001
Tahap: 3 | Status: IN_PROGRESS (siap review; sebagian BLOCKED: B-DD) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Profil `MAP-SKN-MENU-001` v1 (DRAFT), 23 kolom; header pertama = nama dapur.
- [x] Multi-sheet: setiap sheet data (satu per bulan) harus cocok dengan profil; sheet non-menu dilewati parser.
- [x] Transform ke `menu_recipe_line`: lihat SCRUM-73.
- [x] Hasil disimpan saat upload ke `menu_recipe_lines` (B-MAPOUT ditutup), satu transaksi dengan staging (`lib/mapping/persist.ts`).

## Sisa pekerjaan
- [ ] Profil 4 dapur lain (SCRUM-58, butuh sampel; di luar lingkup Sukun)
- [ ] Profil ACTIVE setelah nama field kanonik disetujui (B-DD)

## Test
`src/lib/mapping/sukun-menu.test.ts`, `src/lib/ingest/staging-prisma.test.ts`
