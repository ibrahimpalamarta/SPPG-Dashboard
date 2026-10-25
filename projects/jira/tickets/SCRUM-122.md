# SCRUM-122: Halaman aktivasi akun dari link undangan
Tahap: 1 | Status: IN_PROGRESS (review) | Terakhir diubah: 2026-10-25

## Kondisi awal (hasil audit kode)
- Hanya ada `/reset-password/<token>`: role tidak ditampilkan, setelah sukses diarahkan ke halaman login.

## Yang sudah dikerjakan (feature/scrum-121-122-member-invite)
- [x] `GET /api/auth/invitations/:token` (tanpa sesi, rate limit kredensial): email, nama, role untuk undangan terbuka; terpakai/kedaluwarsa/dibatalkan/akun sudah berpassword → `400 invalid_reset_token` yang identik
- [x] `POST /api/auth/reset-password`: password pertama = aktivasi → membuka sesi seperti login + audit `user.activated`; reset biasa tetap 204 tanpa sesi
- [x] Halaman `/admin/aktivasi/[token]` (publik di `proxy.ts`): email, nama, peran read-only + form kata sandi (memakai ulang `ResetForm`); link tidak valid → "Tautan undangan kedaluwarsa atau dibatalkan"
- [x] Setelah aktif: cookie sesi dipasang lalu diarahkan ke `/overview` (atau `/keamanan` bila role wajib MFA)

## Sisa pekerjaan
- Tidak ada.

## Acceptance criteria
- [x] Penerima membuat kata sandi (kebijakan password yang sama)
- [x] Role tampil read-only
- [x] Link kedaluwarsa/dibatalkan ditolak
- [x] Setelah aktif diarahkan ke Overview sesuai role

## Test
- `controllers/auth/auth.test.ts`: aktivasi membuka satu sesi + audit; `getInvitation` hanya menjawab undangan terbuka, lima kasus penolakan identik.
- Smoke test lokal: halaman aktivasi token valid → 200 dengan email/nama/peran; token buruk → pesan kedaluwarsa/dibatalkan; aktivasi via API → sesi valid, `/api/me` role sesuai, link sekali pakai.

## Blocker / pertanyaan terbuka
- Tidak ada.

## Skema
- Tidak ada.
