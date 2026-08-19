# SPPG Dashboard — Backend (Fase 2: REST API)

Express + TypeScript, Postgres via Prisma, autentikasi Auth0 (Universal Login).

Fase 1 membangun fondasi auth (verifikasi token, sinkronisasi user, role guard,
audit log, seed Super Admin). Fase 2 memasang permukaan REST di atasnya: master
data, upload batch, menu plan, tabel mart, CMS, admin, dan dashboard publik —
lihat [Permukaan API](#permukaan-api).

---

## Alur autentikasi

```
Browser ──Universal Login──> Auth0 ──access token (JWT)──> Frontend
                                                              │
                                        Authorization: Bearer │
                                                              ▼
   requireAuth()      verifikasi signature (JWKS) + issuer + audience + exp
        │                                                     
        ▼                                                     
   attachUser()       find-or-create row `users` berdasarkan `auth0_sub`,
        │             sinkronkan role dari custom claim
        ▼
   requireRole(...)   bandingkan `users.role` dengan allow-list endpoint
        │
        ▼
     handler
```

Tiga lapis, sengaja dipisah:

| Lapis | File | Gagal → | Tanggung jawab |
|---|---|---|---|
| Autentikasi | `src/auth/jwt.ts` | `401` | Token ini asli, masih hidup, dan memang untuk API ini? |
| Provisioning | `src/auth/user-sync.ts` + `guard.ts` | `500` | Identitas Auth0 ini punya row di Postgres. |
| Otorisasi | `src/auth/guard.ts` | `403` | Role-nya boleh melakukan ini? |

Catatan desain:

- **Backend tidak pernah memegang kredensial Auth0.** Verifikasi token cuma
  butuh JWKS publik. Client secret satu-satunya ada di script seed, tidak pernah
  masuk ke service yang jalan (lihat `infra/modules/compute/main.tf` — config
  Auth0 dikirim sebagai `environment`, bukan `secrets`).
- **JWKS di-cache di memori.** `createRemoteJWKSet` hanya fetch ulang kalau
  muncul `kid` yang belum dikenal, dan dibatasi cooldown — jadi tidak ada
  request ke Auth0 di jalur panas, dan tidak bisa dipancing fetch berulang.
- **Otorisasi baca `users.role` dari Postgres, bukan claim mentah.** Claim
  dipakai untuk *menyinkronkan* kolom itu saat login. Efeknya: role yang dicabut
  berlaku pada login berikutnya, dan payload token tidak pernah jadi sumber
  kebenaran untuk keputusan akses.
- **`scope_id` tidak pernah bisa diisi dari token.** Kolom itu hanya diubah
  Super Admin; `findOrCreateUser` sengaja tidak menyentuhnya.
- **Pesan 401 sengaja seragam.** Expired, salah signature, dan salah audience
  menghasilkan respons yang identik. Alasan penolakan tinggal di server.

### Role

Lima role, didefinisikan di Auth0 (Roles & Permissions) dan disalin ke enum
`Role` di Postgres:

| Auth0 role name | Enum | Akses |
|---|---|---|
| `super_admin` | `SUPER_ADMIN` | Penuh — kelola akun & role, master data, audit, seluruh data operasional |
| `data_admin` | `DATA_ADMIN` | Data entry, discope ke satu SPPG Dapur lewat `users.scope_id`; melihat kolom biaya |
| `cms_admin` | `CMS_ADMIN` | Konten publik (pengumuman, dokumen, galeri) saja — **tidak** melihat biaya |
| `internal` | `INTERNAL` | Read-only seluruh dapur, termasuk kolom biaya |
| `public` | `PUBLIC` | Paling terbatas; default untuk token tanpa role yang dikenal |

Claim yang tidak dikenal, salah bentuk, atau tidak ada → `PUBLIC`. Tidak pernah
gagal ke arah yang permisif. Kalau satu user punya beberapa role, yang tertinggi
menang.

### Memasang guard di endpoint

`requireAuth()` + `attachUser()` sudah terpasang sekali untuk seluruh `/api` di
`src/routes/index.ts`. Route tinggal menyebut role yang boleh:

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

`INTERNAL`, `CMS_ADMIN`, dan `PUBLIC` jadi read-only atas data operasional bukan
lewat flag khusus, tapi karena tidak pernah masuk allow-list route yang
mengubahnya.

Untuk route yang discope per SPPG Dapur, jangan pakai `kitchenId` dari client
begitu saja — lewatkan ke `kitchenScope(req.user, requested)` di
`src/lib/scope.ts`. Helper itu membungkus `resolveScopeId` dan menolak (403)
kalau seorang Data Admin meminta dapur di luar `scope_id`-nya:

```ts
const scope = kitchenScope(req.user!, q.kitchenId);
if (!scope.ok) return sendError(res, 'FORBIDDEN');
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
`cms_announcements.status_changed`. Di luar itu ada `user.provisioned`,
`user.role_synced`, dan event seed dari fase 1.

Kegagalan tulis audit tidak pernah menggagalkan request yang memicunya. Jangan
pernah taruh token, password, atau body request mentah di `metadata` — isi nama
field yang berubah, bukan nilainya.

---

## Setup Auth0

Belum ada tenant? Lakukan sekali per environment (staging dan prod **terpisah**).

1. **Tenant** — buat di [manage.auth0.com](https://manage.auth0.com). Satu untuk
   staging, satu untuk production.

2. **API** (ini yang jadi `audience`)
   Applications → APIs → Create API.
   - Identifier: `https://api.sppg-dashboard.example` → jadi `AUTH0_AUDIENCE`
   - Signing algorithm: **RS256**
   - Aktifkan **RBAC** dan **Add Permissions in the Access Token**

3. **Application untuk frontend** — Single Page Application. Set Allowed
   Callback/Logout/Web Origins ke URL frontend. Client ID dipakai frontend;
   backend tidak butuh.

4. **Roles** — User Management → Roles. Buat empat role dengan nama **persis**:
   `super_admin`, `data_admin`, `internal`, `public`. Nama lain akan diabaikan
   backend dan user-nya jatuh ke `PUBLIC`.

5. **Action untuk custom claim** — Actions → Library → Build Custom → trigger
   *Login / Post Login*:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const namespace = 'https://sppg-dashboard.example/roles';
     const roles = event.authorization?.roles ?? [];
     api.accessToken.setCustomClaim(namespace, roles);
   };
   ```

   Deploy, lalu drag ke flow **Login**. `namespace` harus sama persis dengan
   `AUTH0_ROLES_CLAIM`.

6. **Application M2M khusus seeding** — Applications → Create → Machine to
   Machine, authorize ke **Auth0 Management API** dengan **hanya** scope ini:

   ```
   read:users  create:users  read:roles  create:role_members
   ```

   Jangan tambahkan `delete:users`, `update:*`, atau `read:logs`. Aplikasi M2M
   ini terpisah dari aplikasi frontend, dan credential-nya tidak pernah
   dikirim ke service yang jalan — hanya dipakai script seed.

---

## Menjalankan secara lokal

```bash
cd backend
npm install
cp .env.example .env        # isi AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_ROLES_CLAIM
npx prisma migrate deploy   # atau: npm run migrate:dev
npm run dev
```

Butuh Node 20.11+ (`--env-file` dan test runner bawaan). Image produksi pakai
Node 22.

### Seed Super Admin

```bash
# email wajib; password opsional — kalau kosong, digenerate
export SEED_SUPERADMIN_EMAIL=admin@example.com
npm run seed:superadmin
```

Yang dilakukan: cari/buat user di Auth0 lewat Management API → assign role
`super_admin` → upsert row `users` di Postgres → tulis audit log.

- **Idempotent.** Dijalankan ulang tidak membuat duplikat; hanya memastikan
  role-nya tetap `SUPER_ADMIN`. Akun yang sudah ada tidak diubah passwordnya.
- **Password.** Kalau `SEED_SUPERADMIN_PASSWORD` tidak di-set, script
  menggenerate 192-bit acak dan mencetaknya **sekali** ke stdout. Tidak ditulis
  ke file, tidak masuk audit log, tidak bisa diambil lagi. Salin saat itu juga.
- **Diblokir di production.** `NODE_ENV=production` → script berhenti dengan
  exit 1 kecuali dijalankan dengan `--force`.
- **Prasyarat.** Role `super_admin` harus sudah ada di Auth0 (langkah 4 di
  atas), kalau tidak script berhenti dengan pesan yang menjelaskan itu.

#### `Auth0 token request failed (403)`

Client ID, secret, dan domain sudah benar — request-nya **sampai** ke Auth0 dan
ditolak. Yang ditolak adalah **audience**-nya, bukan kredensialnya.

Script meminta token untuk `https://<domain>/api/v2/` (Management API), dan itu
audience yang berbeda dari `AUTH0_AUDIENCE` API aplikasi kita. Mengauthorize M2M
app ke `https://sppg-dashboard-api` tidak memberi akses ke Management API.

Perbaiki di dashboard Auth0:

1. Applications → APIs → **Auth0 Management API** (bawaan, jangan API buatan
   sendiri)
2. Tab **Machine to Machine Applications**
3. Cari aplikasi M2M yang client ID-nya sama dengan `AUTH0_M2M_CLIENT_ID`,
   aktifkan toggle-nya
4. Expand ▸, centang **hanya** empat scope ini, lalu Update:
   `read:users` `create:users` `read:roles` `create:role_members`

Kalau aplikasinya tidak muncul di daftar itu, tipenya bukan Machine to Machine —
buat aplikasi baru dengan tipe tersebut (langkah 6 di bagian Setup Auth0).

#### `PasswordStrengthError: Password is too weak`

Panjang bukan ukurannya. Policy default Auth0 ("Good") menghitung **jenis
karakter**: minimal 3 dari lowercase / uppercase / digit / simbol. Jadi
`supersecret123oke` ditolak walau 17 karakter — isinya cuma huruf kecil dan
angka, 2 jenis.

Yang lolos, misalnya `Supersecret123oke` (huruf besar + kecil + angka) atau
`supersecret123!!!` (huruf kecil + angka + simbol). Atau kosongkan saja
`SEED_SUPERADMIN_PASSWORD` dan biarkan script menggenerate.

Aturan ini sekarang divalidasi lokal sebelum memanggil Auth0
(`auth0Password` di `src/config/env.ts`), jadi kegagalannya instan dan
pesannya menjelaskan apa yang kurang. Policy per-connection bisa diubah di
Authentication → Database → Username-Password-Authentication → Password Policy;
kalau tenant-mu memperketatnya, Auth0 tetap yang berkuasa.

### Test

```bash
npm test
```

Node test runner bawaan — tanpa Jest, tanpa database, tanpa panggilan jaringan.
Token ditandatangani dengan keypair lokal dan Prisma diganti stub in-memory
lewat parameter `db` yang setiap controller terima (`listKitchens(db)`), dengan
default ke singleton di produksi.

Yang ditutup: token valid/expired/salah key/salah issuer/salah audience/tanpa
sub/malformed, keseragaman pesan 401, find-or-create + idempotensi + sinkronisasi
role, penolakan 403 per role, serialisasi BigInt/Decimal/Date, scoping per dapur,
penyaringan kolom biaya SCRUM-13, validasi zod (termasuk bahwa nilai yang ditolak
tidak ikut terkirim di respons 400), dedup `file_hash` SCRUM-6, dan stempel
publishDate + audit log CMS.

Ditambah untuk fase unggah: parsing workbook (pemetaan header yang toleran
kapital/tanda baca/satuan, kolom wajib hilang, sel rusak dilaporkan bernomor
baris, berkas non-xlsx), dan ketiga hasil `POST /api/upload-batches` — impor
bersih dengan `menu_plans` bersarang, `dryRun` yang tidak menulis apa pun,
workbook rusak yang tetap tercatat `DITOLAK`, duplikat, dan balapan `P2002`.
Workbook uji dibangun di memori dengan exceljs, jadi tetap tanpa berkas fixture
dan tanpa jaringan.

> **Jebakan:** script `test` menyebut file test **satu per satu**. Node 20.11
> belum mengembangkan glob untuk `--test` (baru di Node 22), jadi file test baru
> tidak akan jalan sampai ditambahkan ke daftar itu di `package.json`.

Tes memakai stub, jadi tidak ada query Prisma yang benar-benar diadu dengan
schema. Untuk itu jalankan backend terhadap Postgres lokal (`npm run
migrate:deploy && npm run seed:reference && npm run dev`) lalu telusuri koleksi
Postman.

### Postman

`postman/` berisi collection + environment template. Import keduanya, isi
environment, jalankan `Auth / Get Access Token` lebih dulu — token tersimpan
otomatis ke variabel dan dipakai request lain.

Login-nya satu request untuk semua akun; yang membedakan super admin dan akun
low-privilege cuma `username`/`password` di environment.

Collection memuat varian ditolak (401 tanpa token, 401 token invalid, 403 role
salah), karena itu justru inti fase ini. Untuk menguji 403, ganti kredensial ke
akun `internal`/`public`, login ulang, lalu jalankan request `403` itu.

Environment template di-commit dengan nilai kosong. Setelah diisi jangan
di-export menimpa file itu — `postman/*.local.json` sudah di-gitignore untuk
salinan yang terisi.

---

## Konfigurasi & secrets

Tidak ada nilai Auth0 yang hardcoded. Semua lewat environment variable,
divalidasi saat boot di `src/config/env.ts` — service gagal start (bukan jalan
setengah benar) kalau ada yang kurang.

| Variabel | Lokal | Staging / Production |
|---|---|---|
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ROLES_CLAIM` | `.env` | GitHub Environment **variables** → `-var` Terraform → ECS `environment` |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | `.env` / `DATABASE_URL` | Output Terraform → ECS `environment` |
| `DB_USERNAME`, `DB_PASSWORD` | `.env` | AWS Secrets Manager → ECS `secrets` |
| `S3_BUCKET`, `AWS_REGION`, `UPLOAD_MAX_BYTES` | `.env` | Output Terraform → ECS `environment` |
| `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET` | `.env` | GitHub **secrets**, hanya untuk job seed — tidak pernah ke ECS |
| `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD` | shell | GitHub secrets, hanya untuk job seed |

Config Auth0 sengaja dikirim sebagai `environment` biasa, bukan Secrets Manager:
domain, audience, dan nama claim bukan rahasia — semuanya terlihat di token yang
sudah dipegang client. Memperlakukannya sebagai secret hanya menambah biaya
tanpa menambah keamanan.

Staging dan production memakai tenant/API Auth0 berbeda; nilainya di-set per
GitHub Environment sehingga tidak ada satu pun yang masuk ke repo.

### Yang tidak pernah disimpan atau di-log

- Password dan token mentah tidak pernah masuk Postgres — `users` hanya menyimpan
  `auth0_sub`, email, nama, role, scope.
- Prisma query logging dimatikan di luar development (nilai baris akan ikut
  masuk CloudWatch).
- Error dari Management API dicatat sebagai status code saja; body-nya bisa
  memantulkan kembali password saat gagal validasi.
- Error handler mengembalikan `{ error: 'internal_error' }` — stack trace tinggal
  di log server.

---

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma                  16 model, terjemahan sppg_erd.drawio
│   └── migrations/                    termasuk 2 view publik (SCRUM-13)
├── scripts/
│   ├── seed-superadmin.ts             Auth0 Management API → Postgres
│   └── seed-reference-data.ts         6 dapur + 12 baris AKG
├── postman/
├── src/
│   ├── auth/                          seluruh logic auth — terisolasi di sini
│   │   ├── jwt.ts                     requireAuth: verifikasi token
│   │   ├── guard.ts                   attachUser, requireRole, resolveScopeId
│   │   ├── roles.ts                   enum + pemetaan claim Auth0
│   │   ├── user-sync.ts               find-or-create
│   │   ├── audit.ts                   writeAuditLog
│   │   └── *.test.ts
│   ├── lib/                           helper lintas-endpoint
│   │   ├── serialize.ts               BigInt/Decimal/Date → JSON
│   │   ├── pagination.ts              pageQuery + amplop { data, meta }
│   │   ├── scope.ts                   filter multi-tenant per dapur
│   │   ├── visibility.ts              penyaringan kolom biaya (SCRUM-13)
│   │   ├── menu-workbook.ts           parser Excel → menu_plans (SCRUM-6)
│   │   ├── s3.ts                      putObject ke bucket assets
│   │   └── wrap.ts                    async error → next(err)
│   ├── schemas/                       skema zod per domain
│   ├── middleware/                    validate, upload, cors, error-handler
│   ├── routes/                        cermin dari controllers/
│   ├── controllers/                   query Prisma langsung, tanpa layer service
│   ├── config/env.ts                  satu-satunya pembaca process.env
│   ├── db.ts                          singleton + type Db (seam DI untuk test)
│   ├── app.ts                         urutan mount: /api/public sebelum /api
│   └── server.ts
```

Kalau suatu saat provider auth berganti, yang berubah hanya `src/auth/jwt.ts`
(cara token diverifikasi) dan `roles.ts` (dari mana role dibaca).

---

## Permukaan API

Semua di bawah `/api` **wajib** bearer token Auth0, kecuali `/api/public/*` dan
`/health`. Endpoint list mengembalikan `{ data, meta }`; endpoint tunggal
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
| `/api/cms/announcements` (CRUD, JSON) | SUPER_ADMIN, CMS_ADMIN | 14 |
| `/api/cms/documents`, `/gallery` (CRUD, multipart) | SUPER_ADMIN, CMS_ADMIN | 14 |
| `GET /api/admin/users`, `PATCH /:id`, `GET /api/admin/audit-logs` | SUPER_ADMIN | 1 |

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

Tiga hasil `POST /api/upload-batches`, ketiganya tercatat:

| Kondisi | Balasan | Baris `upload_batches` |
|---|---|---|
| `file_hash` sudah ada | `409` + batch lama | — (SCRUM-6 AC3) |
| workbook gagal diparse | `422` + daftar error | `DITOLAK` + `notes` (SCRUM-5 AC3) |
| workbook bersih | `201` + batch | `DITERIMA` + seluruh `menu_plans` |

Import-nya atomic (SCRUM-6 AC2) tanpa blok `$transaction`: baris menu ikut
sebagai `menuPlans.createMany` bersarang di `create` batch-nya, dan Prisma
menjalankan nested write dalam satu transaksi.

Objek S3 ditulis **sebelum** insert: objek yatim harganya receh dan ditimpa
percobaan berikutnya, sedangkan batch yang sudah commit tanpa berkas di
belakangnya adalah lubang di jejak audit. Key-nya diturunkan dari hash
(`upload-batches/<sha256>.xlsx`) sehingga tidak perlu kolom `storage_key` baru.

> **Header Excel-nya masih tebakan.** `HEADERS` di `src/lib/menu-workbook.ts`
> diturunkan dari `schema.prisma` + form SOP-OPR-001, bukan dari workbook asli —
> berkasnya belum tersedia. Kalau nama kolom di berkas sungguhan berbeda, ubah
> label di map itu saja; tidak ada tempat lain yang perlu disentuh.

### Yang belum terisi datanya

Kelima tabel mart (`akg_compliances`, `menu_nutritions`, `daily_kitchens`,
`menu_costs`, `public_summaries`) diturunkan dari data operasional dan **belum
punya penulis** — mekanisme refresh-nya belum diputuskan (Open Question #8 di
`prisma/README.md`). Endpointnya jalan dan membalas halaman kosong. Khusus
`akg_compliances`, pemetaan 4 `portion_class` ke 12 kelompok sasaran AKG juga
belum ada (#4), jadi tabelnya tidak bisa diisi sama sekali sampai itu diputuskan.

Parsing berkas Excel ke `menu_plans` belum termasuk fase ini: `POST
/api/upload-batches` mencatat metadata batch dan menegakkan dedup lewat
`file_hash` UNIQUE, tapi tidak membaca isi berkasnya.

### Pemisahan data (SCRUM-13)

Dua lapis, keduanya perlu:

- **Layer data** — dua view SQL yang hanya memuat kolom non-sensitif. Router
  publik membacanya lewat `$queryRaw`, tidak pernah menyentuh tabel dasar.
- **Layer aplikasi** — `src/lib/visibility.ts`. `menu_plans.hargaBahan`/
  `totalHarga` dan `daily_kitchens.jumlahPm` dibuang untuk role di luar
  SUPER_ADMIN/DATA_ADMIN/INTERNAL; `recipe_costings` dan `menu_costs` sensitif
  seluruhnya sehingga guard menutup resource-nya.

Yang **belum** ada: `GRANT`/RLS per role database (Open Question #2). Penegakan
saat ini masih di aplikasi, bukan di Postgres.
