# SCRUM-121: Undang & kelola anggota (Project Manager MBG)
Fitur: access/members | Tahap: 1 | Status: IN_PROGRESS (review) | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- Auth internal (PR #27) sudah punya `POST /api/admin/users` (akun tanpa password + token set-password), ubah role/status/dapur, reset password, audit.
- Belum ada: status Menunggu aktivasi/Kedaluwarsa, batalkan undangan, TTL undangan terpisah (link 60 menit), guard PM terakhir eksplisit. Halaman bernama "Pengguna".

## Yang sudah dikerjakan (feature/scrum-121-122-member-invite)
- [x] Status anggota diturunkan tanpa tabel baru (`memberStatus()` di `controllers/admin/user.ts`): Nonaktif / Aktif / Menunggu aktivasi / Kedaluwarsa. `GET /admin/users` mengembalikan `memberStatus`, hash password tidak ikut keluar
- [x] Link undangan berlaku `INVITE_TTL_HOURS` (default 72); reset password tetap `PASSWORD_RESET_TTL_MINUTES` (60)
- [x] Kirim ulang undangan: `POST /admin/users/:id/password-reset` pada akun tanpa password (TTL undangan, audit `user.invite_resent`)
- [x] Batalkan undangan: `POST /admin/users/:id/invite-cancel` (hanya akun yang belum aktivasi; akun dihapus beserta link-nya sehingga email bisa diundang ulang; audit `user.invite_cancelled` memuat email; 409 `not_an_invitation` selainnya). Sebelumnya akun hanya dinonaktifkan (01cc182)
- [x] Guard PM terakhir: SUPER_ADMIN aktif berpassword terakhir tidak bisa dinonaktifkan/diturunkan (409 `last_super_admin`)
- [x] Halaman Anggota: undangan lewat modal (email, nama, peran, dapur, pesan opsional; validasi zod di backend); modal hasil menunjukkan apakah email terkirim; badge status 4 nilai; kolom Aksi per baris: Kirim ulang + Batalkan (Menunggu aktivasi/Kedaluwarsa), Ubah role + Nonaktifkan (Aktif), Aktifkan kembali (Nonaktif); tanpa panel Kelola akun
- [x] Anti-eskalasi tetap berlaku untuk semua aksi (`loadManageable`/`mayManageRole`)
- [x] `backend/docs/AUTH.md` diperbarui
- [x] Email undangan (buat & kirim ulang) dikirim lewat SES (`lib/mailer.ts`, template HTML + teks, 7e09b51, 2bb7e64). Bila SES belum dikonfigurasi/gagal, respons `emailed: false` dan tautan diserahkan manual
- [x] Modal ubah role tidak lagi memilih dapur; memberi role Data Operasional mengisi semua dapur (0c420e9, 151fc9a)

## Sisa pekerjaan
- Tidak ada untuk AC tiket. Reset password akun aktif oleh admin tetap manual (tanpa email); hanya "Lupa kata sandi?" mandiri yang lewat SES.

## Acceptance criteria
- [x] Form undangan tervalidasi
- [x] Status Menunggu aktivasi / Aktif / Kedaluwarsa / Nonaktif
- [x] Kirim ulang, batalkan, ubah role, nonaktifkan/aktifkan kembali
- [x] PM MBG terakhir tidak bisa dinonaktifkan
- [x] Semua aksi masuk audit

## Test
- `controllers/admin/user.test.ts` (SCRUM-121): memberStatus, list tanpa hash, TTL 72 jam saat buat & kirim ulang, reset biasa tetap ≤ 1 jam, batal undangan (204 + audit; 409 untuk akun aktif/sudah batal; 403 di bawah role target), guard PM terakhir (409) dan boleh bila ada PM lain. Backend 178/178, `tsc` bersih.
- Smoke test lokal (Postgres dev, backend branch di :8090): undang → PENDING (72 jam) → batal → link ditolak, INACTIVE → aktifkan + kirim ulang → PENDING → aktivasi → ACTIVE; INTERNAL tidak bisa mengundang (403).
- Frontend: lint, knip, `tsc`, build bersih. `/admin/anggota` PM 200, Data Operasional 403.

## Blocker / pertanyaan terbuka
- B-ROLE (B-EMAIL tertutup 2026-10-26)

## Skema
- Tidak ada perubahan skema (status diturunkan dari `users.status`, `password_hash`, `password_reset_tokens`).
