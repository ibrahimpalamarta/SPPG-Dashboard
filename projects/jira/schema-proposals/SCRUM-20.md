# Usulan skema — SCRUM-20 (RBAC & kitchen scope)

Status: **SUDAH TERMIGRASI di branch lokal `feature/scrum-20-rbac`, menunggu approval** (D-01, B-SCHEMA).
Migrasi: `backend/prisma/migrations/20261022000000_rbac_kitchen_scope/migration.sql`.

## 1. Tabel `user_kitchen_scopes`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `user_id` | BIGINT FK → `users.user_id` ON DELETE CASCADE | tidak | PK komposit |
| `kitchen_id` | BIGINT FK → `kitchens.kitchen_id` ON DELETE CASCADE | tidak | PK komposit, index |
| `created_at` | TIMESTAMP | tidak | default now() |

Kolom `users.scope_id` dihapus; datanya dipindah ke tabel ini oleh migrasi.

**Alasan.** PRD §3: Kepala Kitchen/PIC/Ahli Gizi hanya kitchen sendiri, sedangkan Management/Finance/Data Steward lintas kitchen. Data Steward atau PIC yang memegang lebih dari satu dapur butuh relasi many-to-many, dan `scope_id` tunggal tidak cukup. Rujukan: PRD P1-001, NFR-01, US-15.

**Alternatif tanpa tabel baru.**
- (a) Tetap `users.scope_id` (satu dapur per akun). Ini memblok kasus multi-dapur.
- (b) Scope di claim Auth0 `app_metadata.kitchens`. Ini bertentangan dengan D-06 (role/scope dievaluasi dari Postgres) dan membuat scope tidak bisa diaudit di `audit_logs`.

## 2. Kolom `kitchens.code`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `code` | TEXT UNIQUE | ya | SKN, LWG, DNM, PCK, SML. Turen NULL (B-TUREN). |

Diisi seeder `20261022000000-kitchen-codes`.

**Alasan.** PRD menyebut kitchen dengan kode (MAP-**SKN**-CF-001), dan `source_record_id` serta nama berkas template (`MBG_<kode>_<YYYY-MM>`) butuh kode stabil. BRD G7: kode kitchen belum ada di master.

**Alternatif.** Peta konstanta `name → code` di kode aplikasi. Kekurangannya, kode tidak bisa dipakai di query/join.
