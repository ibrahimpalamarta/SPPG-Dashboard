# Autentikasi & otorisasi internal

Menggantikan Auth0. Identitas, password, sesi, MFA, dan role semuanya ada di
Postgres milik aplikasi. Tidak ada layanan identitas eksternal.

## Arsitektur

```
Browser ──form──> frontend-admin (Next.js, server) ──Bearer <session token>──> backend /api
   ▲                    │ cookie httpOnly `sppg_session`                          │
   └────────────────────┘ (hanya frontend yang memegang token)                    ▼
                                                              requireAuth → requirePermission/requireRole → handler
```

**Kenapa session di DB, bukan JWT.** Browser tidak pernah memanggil backend
langsung: frontend-admin meneruskan semuanya dari server-nya. Jadi tidak ada
kebutuhan token yang bisa diverifikasi tanpa database. Session di tabel
`sessions` memberi hal yang JWT sulit beri: nonaktifkan akun, ganti role, atau
cabut sesi **berlaku di request berikutnya**, bukan setelah token kedaluwarsa.
Tidak ada refresh token yang perlu dirotasi.

| Tanggung jawab | File |
|---|---|
| Password (argon2id, kebijakan) | `src/auth/password.ts` |
| Sesi (buat, resolve, cabut) | `src/auth/session.ts` |
| Autentikasi + otorisasi middleware | `src/auth/guard.ts` |
| Peta role → permission (DB, cache 30 dtk) | `src/auth/rbac-store.ts`, `src/auth/roles.ts` |
| Pencegahan eskalasi hak | `src/auth/escalation.ts` |
| Link set/reset password | `src/auth/reset.ts` |
| TOTP + kode pemulihan | `src/auth/mfa.ts` |
| Kripto (AES-GCM, SHA-256, challenge HMAC) | `src/lib/crypto.ts` |
| Audit | `src/auth/audit.ts` |
| Endpoint login/logout/reset/MFA | `src/routes/auth/auth.ts`, `src/controllers/auth/auth.ts` |
| Endpoint admin (pengguna, role) | `src/routes/admin/admin.ts`, `src/controllers/admin/user.ts` |

Tidak ada kripto buatan sendiri: argon2id dari `@node-rs/argon2`, TOTP dari
`otplib`, sisanya `node:crypto` (AES-256-GCM, SHA-256, HMAC-SHA256).

## Alur

**Login** — `POST /api/auth/login {email, password}`
1. Akun tidak ada / nonaktif / belum punya password / sedang terkunci →
   `401 invalid_credentials` yang identik, setelah menghabiskan waktu argon2
   yang sama (tidak membocorkan email mana yang terdaftar).
2. Password salah → hitung gagal; setelah `LOGIN_MAX_FAILURES` (5) akun terkunci
   `LOGIN_LOCK_MINUTES` (15) — termasuk untuk password yang benar.
3. MFA aktif → `{status:"mfa_required", mfaToken}` (challenge 5 menit, ber-HMAC).
   Lanjut `POST /api/auth/mfa/verify {mfaToken, code}`; `code` = 6 digit TOTP atau
   kode pemulihan (sekali pakai). Salah → masuk hitungan gagal yang sama.
4. Berhasil → `{status:"ok", token, expiresAt}`. Token mentah hanya muncul di
   sini; DB menyimpan SHA-256-nya. Frontend menaruhnya di cookie httpOnly.

**Sesi** — idle `SESSION_IDLE_MINUTES` (8 jam, bergeser), batas mutlak
`SESSION_ABSOLUTE_HOURS` (7 hari). Setiap request memeriksa: ada, belum dicabut,
belum kedaluwarsa, tidak idle, dan **`users.status = ACTIVE`**. Semua kegagalan
menjawab `401` yang sama.

**Logout** — `POST /api/auth/logout` mencabut sesi saat ini.
`GET/DELETE /api/auth/sessions[/:id]` daftar dan cabut sesi sendiri.

**Lupa kata sandi (mandiri)** — `POST /api/auth/forgot-password {email}` selalu
menjawab `204` (tidak membocorkan ada/tidaknya akun). Akun `ACTIVE` yang sudah
punya password dikirimi email SES berisi link `ADMIN_BASE_URL/reset-password/<token>`
(token sama dengan reset admin: sekali pakai, `PASSWORD_RESET_TTL_MINUTES`,
audit `auth.password.forgot`). `EMAIL_FROM` (identitas SES terverifikasi) dan
`ADMIN_BASE_URL` harus diisi; kosong = tidak ada yang dikirim. Task role ECS
butuh `ses:SendEmail`.

**Pemulihan password oleh admin** — Super Admin
membuat link sekali pakai: `POST /api/admin/users/:id/password-reset` →
`{resetToken}` (hanya sekali tampil; DB menyimpan hash-nya, berlaku
`PASSWORD_RESET_TTL_MINUTES` = 60). Pemilik akun membuka
`/admin/reset-password/<token>` → `POST /api/auth/reset-password`. Hasilnya:
password baru, semua link lain void, kunci akun dibuka, **semua sesi dicabut**.
Pembuatan akun (`POST /api/admin/users`) memakai mekanisme yang sama sebagai
undangan: akun lahir tanpa password.

**Undangan undangan: akun lahir tanpa password. aktivasi (SCRUM-121/122)** — link undangan berlaku
`INVITE_TTL_HOURS` (72). Status anggota diturunkan, tidak disimpan: `INACTIVE`
→ Nonaktif; punya password → Aktif; tanpa password → Menunggu aktivasi selama
link terakhirnya masih berlaku, selain itu Kedaluwarsa. `POST
/api/admin/users/:id/password-reset` pada akun tanpa password = kirim ulang
undangan (TTL undangan, audit `user.invite_resent`). `POST
/api/admin/users/:id/invite-cancel` membatalkan undangan: semua link void, akun
nonaktif. Halaman `/admin/aktivasi/<token>` memanggil `GET
/api/auth/invitations/:token` (email, nama, role; link terpakai/kedaluwarsa/
dibatalkan → `400 invalid_reset_token`), lalu `POST /api/auth/reset-password`;
untuk password pertama endpoint itu menjawab seperti login (`{status:"ok",
token}`) sehingga anggota langsung masuk ke Overview. PM MBG (SUPER_ADMIN
berpassword) aktif terakhir tidak bisa dinonaktifkan/diturunkan
(`409 last_super_admin`).

**Ganti password** — `POST /api/auth/password` (butuh password lama; sesi lain
dicabut).

**MFA** — `POST /api/auth/mfa/setup` → secret + otpauth URL (belum aktif) →
`POST /api/auth/mfa/enable {code}` → aktif + 10 kode pemulihan (sekali tampil).
`POST /api/auth/mfa/disable {password, code}`. Secret TOTP disimpan terenkripsi
AES-256-GCM dengan `MFA_ENCRYPTION_KEY`. `MFA_REQUIRED_ROLES` memaksa MFA per
role: sesi mereka hanya membuka rute MFA/logout/`/api/me` sampai terdaftar
(`403 mfa_enrollment_required` selainnya). Super Admin bisa mereset MFA user yang
kehilangan perangkat (`POST /api/admin/users/:id/mfa-reset`).

## Role & permission

Role (enum `Role`, tidak berubah dari sebelum migrasi): `SUPER_ADMIN`,
`DATA_ADMIN` (discope per dapur lewat `user_kitchen_scopes`), `CMS_ADMIN`,
`INTERNAL` (read-only), `PUBLIC`.

Permission (`PERMISSIONS` di `src/auth/roles.ts`):
`upload:create`, `upload:view`, `batch:review`, `batch:publish`, `mapping:view`,
`mapping:propose`, `reference:view`, `reference:edit`, `dashboard:view`,
`users:read`, `users:manage`, `settings:manage`, `audit:read`.

Peta role → permission ada di tabel `role_permissions` dan diubah lewat
`PUT /api/admin/roles/:role/permissions` (UI: **Peran & Izin**), **tanpa
deploy**. Aturan:
- `SUPER_ADMIN` selalu memegang semua permission dan tidak disimpan di tabel —
  tidak bisa dicabut, jadi tidak ada skenario lockout.
- Role baru/akun baru **tidak** otomatis mendapat hak admin. `users:*`,
  `settings:manage`, `audit:read` awalnya hanya dimiliki `SUPER_ADMIN`.
- **Anti-eskalasi.** Non-Super Admin dengan `users:manage` hanya bisa
  membuat/mengubah/mereset akun ber-role yang permission-nya *seluruhnya* ia
  miliki sendiri, tidak pernah menyentuh `SUPER_ADMIN`. Dengan `settings:manage`
  ia hanya bisa memberi permission yang ia miliki dan tidak boleh mengedit role-nya
  sendiri. Tidak ada yang bisa mengubah role/status dirinya sendiri.
- Perubahan role atau penonaktifan **langsung mencabut semua sesi** akun itu.
- Perubahan peta permission berlaku dalam ≤ 30 detik antar-instance (cache);
  di instance yang sama seketika.

## Skema database

Migration `20261025000000_internal_auth`. `auth0_sub` dibuang; akun lama tetap
ada dengan `password_hash` NULL (harus diundang ulang lewat link).

| Tabel | Isi |
|---|---|
| `users` | + `password_hash`, `failed_login_count`, `locked_until`, `mfa_enabled`, `mfa_secret_enc` |
| `sessions` | `token_hash` (unik), `expires_at`, `last_seen_at`, `revoked_at`, `ip`, `user_agent`; FK ke `users` (cascade) |
| `password_reset_tokens` | `token_hash` (unik), `expires_at`, `used_at` |
| `mfa_recovery_codes` | `code_hash`, `used_at` |
| `role_permissions` | PK `(role, permission)` |
| `audit_logs` | tidak berubah; sekarang juga memuat peristiwa auth |

## Audit

`auth.login.success|failed`, `auth.logout`, `auth.password.reset|changed`,
`auth.mfa.enabled|disabled|failed|recovery_code_used`, `session.revoked`,
`user.created|updated|password_reset_issued|mfa_reset|invite_resent|invite_cancelled|activated`,
`role.permissions_updated`. Metadata hanya berisi IP, alasan, dan nama field —
**tidak pernah** password, token, atau kode. Tabel hanya bisa dibaca lewat API
(`audit:read`); tidak ada endpoint tulis/hapus.

## Memproteksi endpoint baru

Semua rute di bawah `/api` (kecuali `/api/public/*`, `/api/auth/*`, `/health`)
sudah melewati `requireAuth()` di `src/routes/index.ts`. Cukup tambahkan izin:

```ts
router.post('/x', requirePermission('reference:edit'), validate({ body }), wrap(handler()));
```

Pakai `requirePermission`, bukan `requireRole`, untuk fitur baru. Untuk data
per-dapur lewatkan lewat `kitchenScope(req.user!, requested)` (`src/lib/scope.ts`).
Jangan pernah mengandalkan menu/tombol frontend sebagai satu-satunya pembatas.

## Environment variables

| Variabel | Keterangan |
|---|---|
| `MFA_ENCRYPTION_KEY` | **Secret, wajib.** `openssl rand -base64 32`. Mengubahnya mendaftar-ulang semua autentikator. Di ECS: Secrets Manager (dibuat Terraform) |
| `MFA_REQUIRED_ROLES` | Mis. `SUPER_ADMIN`. Kosong = MFA opsional |
| `SESSION_IDLE_MINUTES`, `SESSION_ABSOLUTE_HOURS` | 480 / 168 |
| `LOGIN_MAX_FAILURES`, `LOGIN_LOCK_MINUTES` | 5 / 15 |
| `AUTH_ENDPOINT_RATE_LIMIT_WINDOW_MS`, `_MAX` | limiter per-IP untuk login/MFA/reset (15 mnt / 20) |
| `PASSWORD_RESET_TTL_MINUTES` | 60 |
| `INVITE_TTL_HOURS` | 72 |
| `TRUST_PROXY_HOPS` | 1 = hanya ALB. **2** bila frontend-admin menjangkau API lewat ALB juga (diset Terraform). Salah set → semua user berbagi satu limiter IP |

Frontend-admin hanya butuh `API_BASE_URL` (server-side) dan `NEXT_PUBLIC_BASE_PATH`
(diturunkan dari `next.config.ts`).

## Membuat Super Admin pertama (aman)

Setelah `migrate:deploy`:

```bash
# tanpa password: dicetak link set-password sekali pakai (disarankan di production)
SEED_SUPERADMIN_EMAIL=pm@example.go.id NODE_ENV=production npm run seed:superadmin -- --force
# buka  https://<host>/admin/reset-password/<token>  lalu pilih password
```

Script idempoten (mempromosikan akun yang ada ke `SUPER_ADMIN`, mengaktifkannya,
membuka kuncinya). Jika `SEED_SUPERADMIN_PASSWORD` diisi, password itu dipakai
dan semua sesi akun dicabut. Tidak ada kredensial default di kode. Segera
aktifkan MFA di **Keamanan akun** lalu pertimbangkan `MFA_REQUIRED_ROLES=SUPER_ADMIN`.

## Deployment & produksi

1. Terraform membuat secret `…-mfa-encryption-key` (random 32 byte), memberi izin
   baca ke execution role, dan menyuntikkannya sebagai `MFA_ENCRYPTION_KEY` ke
   task backend. Task frontend-admin menerima `API_BASE_URL` (set
   `frontend_api_base_url` ke domain bersertifikat begitu ACM dipasang — listener
   HTTP mengalihkan ke HTTPS).
2. `migrate:deploy` menjalankan migrasi (job `migrate` yang sudah ada).
3. Buat Super Admin pertama (di atas). Akun lama harus diundang ulang.
4. Hapus `AUTH0_*` dari GitHub Environment variables dan secret `AUTH0_M2M_*`.
5. Cookie sesi `Secure` hanya di `NODE_ENV=production`; pastikan HTTPS aktif.

## Menjalankan test

```bash
cd backend && npm test        # 160+ test, tanpa database/jaringan
npx tsc --noEmit -p tsconfig.json
cd ../frontend-admin && npm run lint && npm run knip && npm run build
```

Cakupan: login valid/invalid & respons seragam, lockout, hashing argon2id,
akses tanpa autentikasi, sesi kedaluwarsa/dicabut/idle/akun nonaktif, beda
role & permission, anti-eskalasi, reset password (sekali pakai, kedaluwarsa,
cabut sesi), MFA (TOTP, kode pemulihan, challenge palsu/kedaluwarsa), audit tanpa
secret, editor role-permission, isolasi dapur (`scope.test.ts`).
Rate limiter Express (`express-rate-limit`) tidak diuji unit — diuji manual.

## Keterbatasan yang diketahui

- **Reset buatan admin tanpa email.** Undangan (buat & kirim ulang) dikirim lewat
  SES berisi link `ADMIN_BASE_URL/aktivasi/<token>` plus pesan opsional dari
  pengundang; bila SES belum dikonfigurasi atau gagal, respons `emailed: false`
  dan link diserahkan manual. Reset password akun aktif tetap manual.
- **Kode TOTP bisa dipakai ulang dalam jendela 30 detik** (tidak ada pelacakan
  langkah terakhir). Dibatasi lockout 5 percobaan.
- **MFA tanpa QR code** — pengguna memasukkan secret / membuka tautan otpauth.
- **Cache izin 30 detik antar-instance** setelah mengubah peta role.
- **Rate limiter in-memory** per proses; dengan banyak task ECS batasnya per task.
- Hash password Auth0 tidak bisa diekspor → semua akun lama wajib set password baru.
