# SPPG Dashboard — Backend (Fase 2: REST API)

Express + TypeScript, Postgres via Prisma, autentikasi internal (password +
sesi di Postgres, MFA TOTP). Dokumen lengkapnya: [docs/AUTH.md](docs/AUTH.md).

Fase 1 membangun fondasi auth (login, sesi, role guard, audit log, seed Super
Admin). Fase 2 memasang permukaan REST di atasnya: master data, upload batch,
menu plan, tabel mart, CMS, admin, dan dashboard publik — lihat
[Permukaan API](#permukaan-api).

---

## Alur autentikasi

```
frontend-admin (server) ──Authorization: Bearer <session token>──> /api
   requireAuth()        cari sesi (hash token), cek belum dicabut / kedaluwarsa /
        │               idle, dan users.status = ACTIVE; muat user + permission
        ▼
   requirePermission()  permission role (tabel role_permissions) atau
   / requireRole()      allow-list role
        │
        ▼
     handler
```

Tiga lapis, sengaja dipisah:

| Lapis | File | Gagal → | Tanggung jawab |
|---|---|---|---|
| Autentikasi | `src/auth/guard.ts` (`requireAuth`) + `session.ts` | `401` | Sesi ini asli, hidup, dan akunnya aktif? |
| Kredensial | `src/controllers/auth/auth.ts` | `401` seragam | Email/password (+MFA) benar? Lockout, rate limit |
| Otorisasi | `src/auth/guard.ts` | `403` | Role/permission-nya boleh melakukan ini? |

Catatan desain:

- **Role dan permission dibaca dari Postgres di setiap request**, jadi mencabut
  sesi, menonaktifkan akun, atau mengubah role berlaku di request berikutnya.
- **Scope dapur (`user_kitchen_scopes`) hanya diubah lewat admin API.**
- **Pesan 401 sengaja seragam**: sesi tak dikenal, dicabut, kedaluwarsa, dan
  akun nonaktif menghasilkan respons yang identik.

### Role

Tujuh role di enum `Role` (PRD Oktober 2026 §3):

| Enum | Akses |
|---|---|
| `SUPER_ADMIN` | **Admin Sistem / PM MBG.** Penuh — kelola akun & role, master data, audit, seluruh data operasional. Selalu memegang semua permission |
| `MANAGEMENT` | COO/Head of MBG: semua dapur, agregat, read-only, melihat kolom biaya |
| `FINANCE` | Semua dapur, metrik finansial, read-only, melihat kolom biaya |
| `DATA_STEWARD` | Analyst pusat, semua dapur: review/publish batch, mapping, referensi, audit; melihat kolom biaya |
| `KEPALA_KITCHEN` | Dapur sendiri, read-only; melihat kolom biaya |
| `DATA_ADMIN` | PIC/Data Admin Kitchen: upload untuk dapur sendiri; melihat kolom biaya |
| `AHLI_GIZI` | Dapur sendiri: dukung mapping menu; **tidak** melihat biaya |

Role per dapur (`KEPALA_KITCHEN`, `DATA_ADMIN`, `AHLI_GIZI`) wajib punya minimal satu
baris di `user_kitchen_scopes`; tanpa itu mereka tidak melihat dapur mana pun.

Route baru memeriksa **permission**, bukan role: `requirePermission('upload:create')`.
Pemetaan role → permission ada di tabel `role_permissions` dan diubah lewat
`PUT /api/admin/roles/:role/permissions` tanpa deploy; daftar permission yang
dikenal ada di `PERMISSIONS` (`src/auth/roles.ts`).

### Memasang guard di endpoint

`requireAuth()` sudah terpasang sekali untuk seluruh `/api` di
`src/routes/index.ts`. Route tinggal menyebut role atau permission yang boleh:

```ts
// src/routes/master/kitchen.ts
kitchenRouter.get('/', validate({ query: kitchenListQuery }), wrap(listKitchens()));
kitchenRouter.post(
  '/',
  requireRole('SUPER_ADMIN'),
  validate({ body: kitchenCreate }),
  wrap(createKitchen()),
);
```

`MANAGEMENT`, `FINANCE`, dan `KEPALA_KITCHEN` jadi read-only atas data operasional bukan
lewat flag khusus, tapi karena tidak pernah masuk allow-list route yang
mengubahnya.

Untuk route yang discope per SPPG Dapur, jangan pakai `kitchenId` dari client
begitu saja — lewatkan ke `kitchenScope(req.user, requested)` di
`src/lib/scope.ts`. Helper itu membungkus `resolveKitchenIds` dan menolak (403
`forbidden_kitchen`, "Anda tidak memiliki akses ke kitchen ini.") kalau
pemanggil meminta dapur di luar scope-nya:

```ts
const scope = kitchenScope(req.user!, q.kitchenId);
if (!scope.ok) return sendError(res, 'FORBIDDEN_KITCHEN');
const where = { ...kitchenWhere(scope), /* filter lain */ };
```

Tiga pola wajib di setiap endpoint baru: `validate({...})` untuk input,
`wrap(...)` supaya rejection async sampai ke error handler (Express 4 tidak
menangkapnya sendiri), dan `sendJson` supaya BigInt/Decimal tidak menggagalkan
`res.json`.

### Audit log

`writeAuditLog(db, { userId, action, entity, entityId, metadata })`.

Setiap endpoint yang mengubah data menulis satu baris — itu syarat eksplisit
SCRUM-1 dan SCRUM-14 ("all actions logged"). Action-nya dinamai
`<tabel>.<peristiwa>`, mis. `kitchen.created`, `upload_batch.reviewed`,
`cms_announcements.status_changed`. Di luar itu ada event auth (`auth.login.success`, `session.revoked`, ...; daftarnya di
[docs/AUTH.md](docs/AUTH.md)) serta event seed dari fase 1.

Kegagalan tulis audit tidak pernah menggagalkan request yang memicunya. Jangan
pernah taruh token, password, atau body request mentah di `metadata` — isi nama
field yang berubah, bukan nilainya.

---

## Menjalankan secara lokal

```bash
cd backend
npm install
cp .env.example .env        # isi DATABASE_URL, S3_BUCKET, MFA_ENCRYPTION_KEY
npx prisma migrate deploy   # atau: npm run migrate:dev
npm run seed                # data acuan: 6 dapur + 12 target AKG
npm run dev
```

Butuh Node 20.11+ (`--env-file` dan test runner bawaan). Image produksi pakai
Node 22.

### Seed data

```bash
npm run seed
```

Satu runner, `prisma/seed.ts`, menjalankan setiap berkas di `prisma/seeders/`
yang belum pernah diterapkan ke database ini, berurutan sesuai nama berkas, lalu
mencatatnya di tabel `seed_history` — persis peran tabel `SequelizeData` di
seeder Sequelize. Aman dijalankan berkali-kali: seeder yang sudah tercatat
dilewati, tidak dijalankan ulang, jadi tidak ada data terduplikasi.

Seeder dan baris `seed_history`-nya ditulis dalam satu transaksi. Seeder yang
gagal di tengah jalan tidak meninggalkan apa pun untuk di-retry — `npm run seed`
berikutnya mengulanginya dari awal.

Butuh tambahan seed nanti? Buat berkas baru di `prisma/seeders/`, namanya
`<YYYYMMDDHHMMSS>-<slug>.ts` (gaya seeder Sequelize, supaya nama berkas sudah
berurutan sesuai waktu jalannya), yang default-export satu fungsi:

```ts
import type { Prisma } from '@prisma/client';

export default async function up(db: Prisma.TransactionClient) {
  // insert/upsert di sini
}
```

Jangan pernah mengubah atau mengganti nama seeder yang sudah pernah jalan di
suatu environment — nama berkasnya adalah identitasnya di `seed_history`, dan
mengganti nama membuat runner mengira seeder itu belum pernah dijalankan lalu
menjalankannya lagi.

### Seed Super Admin

```bash
export SEED_SUPERADMIN_EMAIL=admin@example.com
npm run seed:superadmin
```

Membuat (atau mempromosikan) akun `SUPER_ADMIN` di Postgres dan menulis audit log.

- **Idempotent.** Dijalankan ulang tidak membuat duplikat; memastikan role
  `SUPER_ADMIN`, status aktif, dan kunci akun terbuka.
- **Tanpa password (disarankan).** Kalau `SEED_SUPERADMIN_PASSWORD` kosong, dicetak
  link set-password sekali pakai (`/admin/reset-password/<token>`). Tidak ada
  password yang lewat shell history atau log CI.
- **Dengan password.** Harus lolos kebijakan: 12+ karakter dan 3 dari huruf
  kecil / besar / angka / simbol. Semua sesi akun itu dicabut.
- **Diblokir di production.** `NODE_ENV=production` → exit 1 kecuali `--force`.

### Test

```bash
npm test
```

Node test runner bawaan — tanpa Jest, tanpa database, tanpa panggilan jaringan.
Prisma diganti stub in-memory lewat parameter `db` yang setiap controller terima
(`listKitchens(db)`), dengan default ke singleton di produksi.

Yang ditutup: login valid/invalid + respons seragam, lockout, argon2id, sesi
hidup/dicabut/kedaluwarsa/idle/akun nonaktif, reset password, MFA, anti-eskalasi
hak akses, editor role-permission, penolakan 403 per role/permission, serialisasi BigInt/Decimal/Date, scoping per dapur,
penyaringan kolom biaya SCRUM-13, validasi zod (termasuk bahwa nilai yang ditolak
tidak ikut terkirim di respons 400), peringatan duplikat `file_hash`, dan stempel
publishDate + audit log CMS.

Ditambah untuk fase unggah: parsing workbook (pemetaan header yang toleran
kapital/tanda baca/satuan, kolom wajib hilang, sel rusak dilaporkan bernomor
baris, berkas non-xlsx), dan hasil `POST /api/upload-batches` —
batch PROCESSING → NEEDS_REVIEW / NEEDS_MAPPING_UPDATE, `dryRun` yang tidak menulis apa pun,
duplikat jadi peringatan, S3 gagal → FAILED, dan transisi status tak sah (SCRUM-22).
Workbook uji dibangun di memori dengan exceljs, jadi tetap tanpa berkas fixture
dan tanpa jaringan.

> **Jebakan:** script `test` menyebut file test **satu per satu**. Node 20.11
> belum mengembangkan glob untuk `--test` (baru di Node 22), jadi file test baru
> tidak akan jalan sampai ditambahkan ke daftar itu di `package.json`.

Tes memakai stub, jadi tidak ada query Prisma yang benar-benar diadu dengan
schema. Untuk itu jalankan backend terhadap Postgres lokal (`npm run
migrate:deploy && npm run seed && npm run dev`) lalu coba endpoint-nya dengan sesi hasil `POST /api/auth/login`.

---

## Konfigurasi & secrets

Semua lewat environment variable, divalidasi saat boot di `src/config/env.ts` —
service gagal start (bukan jalan setengah benar) kalau ada yang kurang.

| Variabel | Lokal | Staging / Production |
|---|---|---|
| `MFA_ENCRYPTION_KEY` | `.env` | AWS Secrets Manager (dibuat Terraform) → ECS `secrets` |
| `MFA_REQUIRED_ROLES`, `TRUST_PROXY_HOPS` | `.env` | Terraform → ECS `environment` |
| `SESSION_*`, `LOGIN_*`, `AUTH_ENDPOINT_RATE_LIMIT_*`, `PASSWORD_RESET_TTL_MINUTES` | `.env` (opsional) | default; override lewat ECS `environment` |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | `.env` / `DATABASE_URL` | Output Terraform → ECS `environment` |
| `DB_USERNAME`, `DB_PASSWORD` | `.env` | AWS Secrets Manager → ECS `secrets` |
| `DATABASE_URL_PUBLIC` | `.env` (opsional) | Secrets Manager → ECS `secrets`, lewat `public_db_secret_key` |
| `S3_BUCKET`, `AWS_REGION`, `UPLOAD_MAX_BYTES` | `.env` | Output Terraform → ECS `environment` |
| `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD` | shell | hanya untuk menjalankan seed, tidak pernah ke ECS |

### Yang tidak pernah disimpan atau di-log

- Password mentah, token sesi mentah, token reset, dan kode MFA tidak pernah masuk
  Postgres atau log — yang tersimpan hanya hash argon2id / SHA-256 dan secret TOTP
  terenkripsi AES-256-GCM.
- Prisma query logging dimatikan di luar development (nilai baris akan ikut
  masuk CloudWatch).
- Respons validasi (400) hanya memuat nama field, tidak pernah nilai yang ditolak.
- Error handler mengembalikan `{ error: 'internal_error' }` — stack trace tinggal
  di log server.

---

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma                  17 model, terjemahan sppg_erd.drawio + seed_history
│   ├── migrations/                    2 view publik + role sppg_public (SCRUM-13) + seed_history
│   ├── seed.ts                        runner: jalankan seeder yang belum tercatat
│   └── seeders/                       satu berkas per seed, gaya Sequelize
├── scripts/
│   ├── seed-superadmin.ts             buat/promosikan Super Admin di Postgres
│   └── grant-public-role.ts           password + LOGIN untuk sppg_public
├── docs/AUTH.md                       arsitektur auth, alur, deploy, keterbatasan
├── src/
│   ├── auth/                          seluruh logic auth — terisolasi di sini
│   │   ├── guard.ts                   requireAuth, requireRole, requirePermission
│   │   ├── session.ts, password.ts    sesi di DB, argon2id + kebijakan password
│   │   ├── mfa.ts, reset.ts           TOTP + kode pemulihan, link set/reset password
│   │   ├── rbac-store.ts, roles.ts    peta role → permission dari DB
│   │   ├── escalation.ts              pencegahan eskalasi hak akses
│   │   ├── audit.ts                   writeAuditLog
│   │   └── *.test.ts
│   ├── lib/                           helper lintas-endpoint
│   │   ├── serialize.ts               BigInt/Decimal/Date → JSON
│   │   ├── pagination.ts              pageQuery + amplop { data, meta }
│   │   ├── scope.ts                   filter multi-tenant per dapur
│   │   ├── visibility.ts              penyaringan kolom biaya (SCRUM-13)
│   │   ├── s3.ts                      putObject ke bucket assets
│   │   └── wrap.ts                    async error → next(err)
│   ├── schemas/                       skema zod per domain
│   ├── middleware/                    validate, upload, cors, error-handler
│   ├── routes/                        cermin dari controllers/
│   ├── controllers/                   query Prisma langsung, tanpa layer service
│   ├── config/env.ts                  satu-satunya pembaca process.env
│   ├── db.ts                          prisma + publicDb + type Db (seam DI test)
│   ├── app.ts                         urutan mount: /api/public sebelum /api
│   └── server.ts
```

---

## Permukaan API

Semua di bawah `/api` **wajib** bearer token sesi, kecuali `/api/public/*`,
`/api/auth/login|mfa/verify|reset-password`, dan `/health`. Endpoint list mengembalikan `{ data, meta }`; endpoint tunggal
mengembalikan objek telanjang. Seluruh BigInt keluar sebagai string.

### Publik — tanpa token (SCRUM-10/13)

Di-mount **sebelum** router terautentikasi, dengan rate limiter sendiri.
Merutekan pada `publicId` (UUID), tidak pernah pada id berurutan.

| Endpoint | Sumber |
|---|---|
| `GET /api/public/summary` | `public_summaries`, periode terbaru |
| `GET /api/public/kitchens` | view `public_kitchen_coverage_view` |
| `GET /api/public/nutrition` | view `public_menu_nutrition_view` |
| `GET /api/public/announcements`, `/:publicId` | hanya status `PUBLISHED` |
| `GET /api/public/documents` | hanya `PUBLISHED` |
| `GET /api/public/gallery` | hanya `PUBLISHED` |

### Terautentikasi

| Endpoint | Role penulis | Scrum |
|---|---|---|
| `GET/POST /api/kitchens`, `GET/PATCH /:id` | SUPER_ADMIN | 15 |
| `GET/POST /api/ingredients`, `GET/PATCH /:id` | SUPER_ADMIN, DATA_ADMIN | — |
| `GET /api/akg-targets`, `/:id` | read-only (hasil seed) | 8 |
| `POST /api/upload-batches` (multipart), `GET`, `GET/PATCH /:id` | SUPER_ADMIN, DATA_ADMIN | 5, 6, 7 |
| `GET /api/menu-plans`, `/:id` | read-only (dari import) | 2 |
| `GET /api/menu-plans/:id/recipe-costings` | internal-only | 13 |
| `GET /api/menu-nutritions` | read-only | 12 |
| `GET /api/daily-kitchens` | read-only | 11 |
| `GET /api/akg-compliances` | read-only | 8 |
| `GET /api/menu-costs` | internal-only | 13 |
| `GET /api/summaries`, `GET /api/dashboard/summary` | read-only | 9, 11 |
| `/api/cms/announcements` (CRUD, JSON) | SUPER_ADMIN | 14 |
| `/api/cms/documents`, `/gallery` (CRUD, multipart) | SUPER_ADMIN | 14 |
| `/api/admin/users` (daftar, buat, ubah, reset password/MFA, cabut sesi), `/api/admin/roles`, `/api/admin/audit-logs` | `users:read/manage`, `settings:manage`, `audit:read` (default SUPER_ADMIN) | 1 |
| `/api/auth/*` (logout, sesi, ganti password, MFA) | sesi sendiri | — |

### Unggah berkas (SCRUM-5, 6, 14)

Byte-nya lewat API (`multipart/form-data`, multer `memoryStorage`), diparse di
request yang sama, lalu ditulis ke bucket assets S3. Tidak ada presigned URL:
backend perlu memegang isi berkasnya untuk bisa memeriksa formatnya sama
sekali, yang justru inti SCRUM-5 AC2.

```
POST /api/upload-batches          multipart: file=<menu.xlsx>, kitchenId, notes?
POST /api/upload-batches?dryRun=true   parse + laporkan, tanpa menulis apa pun
POST /api/cms/documents           multipart: file=<sop.pdf>, title, category
POST /api/cms/gallery             multipart: file=<foto.jpg>, imageTitle, ...
PATCH /api/cms/documents/:id      file opsional — tanpa file, metadata saja
```

`fileName`, `fileHash`, dan `rowCount` **tidak lagi diterima dari client**:
server sudah memegang byte-nya, jadi ketiganya diambil dari berkas itu sendiri.
Begitu juga `storageKey` dan `fileType` CMS. Efeknya, tidak ada lagi record yang
bisa menunjuk ke objek yang tak pernah diunggah atau mengaku berformat lain.

Sejak SCRUM-22/37 upload **hanya membuka batch dan menyimpan berkas**: tidak
ada lagi tulisan ke `menu_plans` (tabel kanonik diisi saat publish nanti).
Field form: `file`, `kitchenId`, `domain` (CASHFLOW, MENU, RAB, PO,
GOODS_RECEIPT, VENDOR_PAYMENT, INPUT_MAKER), `sourceSystem?` (default
INTERNAL), `period?` (`YYYY-MM`), `notes?`, `replaces?` (publicId batch karantina yang
diunggah ulang; batch itu jadi `FAILED` + `error_code = REPLACED`, "Diganti").

| Kondisi | Balasan | Baris `upload_batches` |
|---|---|---|
| bukan zip / bukan .xlsx | `400` | — |
| `kitchenId` di luar scope | `403 forbidden_kitchen` | — |
| berkas dikenali profil (SCRUM-39) | `201` + batch + `mapping` (ringkasan adapter) | `NEEDS_REVIEW`, `mapping_profile_id` + `template_version` terisi |
| berkas tidak dikenali | `201` + batch + `columnDiff` | `NEEDS_MAPPING_UPDATE` (`error_code = PROFILE_NOT_DETECTED` / `PROFILE_AMBIGUOUS`) |
| hash sama untuk kitchen + domain yang sama | `201` + batch baru + `warning.code = DUPLICATE_FILE` | batch baru; penggandaan dicegah saat publish |
| S3 gagal | `500` | `FAILED` (`error_code = STORAGE_FAILED`) — tidak tertinggal di PROCESSING |

Key S3-nya `upload-batches/<publicId>.xlsx` (atau `.csv`) (kolom `storage_key`), tidak pernah
memuat nama berkas asli. Batch lama sebelum SCRUM-22 tetap di key turunan hash.

Transisi status hanya lewat `canTransition` di `src/lib/upload-status.ts`;
`PATCH /api/upload-batches/:id` (permission `batch:review`) menolak transisi
tak sah dengan `409 invalid_transition`. Event `upload_started`,
`upload_completed`, `upload_failed` ditulis sebagai satu baris JSON di stdout
lewat `trackEvent` (`src/lib/events.ts`).

> Berkas `.xlsx` dan `.csv` diterima. CSV dibaca sel demi sel sebagai string
> apa adanya (lihat `src/lib/ingest/workbook.ts`); fixture anonim baseline Sukun
> ada di `src/lib/ingest/fixtures/`.
>
> Profil mapping ada di `src/lib/mapping/profiles.ts` (registry = config di repo,
> B-REG). Profil dipilih dari kitchen + domain + source + header; hasil adapter
> belum disimpan (B-MAPOUT), hanya ringkasannya ikut response.

### Yang belum terisi datanya

Kelima tabel mart (`akg_compliances`, `menu_nutritions`, `daily_kitchens`,
`menu_costs`, `public_summaries`) diturunkan dari data operasional dan **belum
punya penulis** — mekanisme refresh-nya belum diputuskan (Open Question #8 di
`prisma/README.md`). Endpointnya jalan dan membalas halaman kosong. Khusus
`akg_compliances`, pemetaan 4 `portion_class` ke 12 kelompok sasaran AKG juga
belum ada (#4), jadi tabelnya tidak bisa diisi sama sekali sampai itu diputuskan.

Parsing berkas ke tabel staging per domain belum ada (SCRUM-24/35/36/118):
`POST /api/upload-batches` menyimpan berkas dan metadata batch saja.

### Pemisahan data (SCRUM-13)

Tiga lapis, semuanya perlu:

- **Layer koneksi** — role Postgres `sppg_public`. `/api/public/*` memakai
  `publicDb` (`src/db.ts`), client yang terhubung sebagai role itu. Role-nya
  cuma punya `GRANT SELECT` ke dua view publik, `public_summaries`, dan tiga
  tabel CMS. `menu_costs`, `menu_plans`, `daily_kitchens`, `recipe_costings`,
  dan `users` **tidak bisa dibaca sama sekali** dari koneksi itu — kesalahan
  kode gagal di database, bukan lolos ke publik.
- **Layer data** — dua view SQL yang hanya memuat kolom non-sensitif. View
  berjalan dengan hak pemiliknya (bukan `security_invoker`), jadi role publik
  membacanya tanpa perlu akses ke tabel dasarnya.
- **Layer aplikasi** — `src/lib/visibility.ts`, untuk route **terautentikasi**.
  `menu_plans.hargaBahan`/`totalHarga` dan `daily_kitchens.jumlahPm` dibuang
  untuk role di luar `COST_ROLES` (semua kecuali AHLI_GIZI); `recipe_costings` dan
  `menu_costs` sensitif seluruhnya sehingga guard menutup resource-nya.

Menyalakannya (sekali per environment, setelah `migrate:deploy`):

```bash
PUBLIC_DB_PASSWORD='...' npm run grant:public-role
```

Migrasi `20260819000000_public_db_role` membuat role-nya `NOLOGIN` — password
tidak pernah masuk berkas `.sql` yang di-commit. Script di atas yang memberi
password + `LOGIN`, lalu mencetak `DATABASE_URL_PUBLIC` yang harus disimpan ke
Secrets Manager. Selama `DATABASE_URL_PUBLIC` kosong, aplikasi jalan dengan
koneksi utama dan **memperingatkan saat boot**; di `NODE_ENV=production` ia
menolak start sama sekali.

Yang masih di aplikasi, bukan di database: filter `status = PUBLISHED` untuk
konten CMS. Role publik bisa membaca ketiga tabel CMS termasuk draft —
mempersempitnya lagi butuh view per tabel atau RLS.
