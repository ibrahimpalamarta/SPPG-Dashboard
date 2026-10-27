# SCRUM-20: RBAC 2 role
Fitur: access/rbac | Tahap: 1 | Status: IN_PROGRESS (sebagian BLOCKED: B-ROLE) | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- Branch `feature/scrum-20-rbac` (commit `3c48256`, 22 Okt, lokal) sudah memuat backend RBAC berbasis permission.
- Sebelum branch itu (develop): hanya `requireRole` + `users.scope_id` tunggal; DATA_ADMIN tanpa scope melihat semua dapur (celah).

## Yang sudah dikerjakan
- [x] `PERMISSIONS`, `ROLE_PERMISSIONS`, `hasPermission` — `backend/src/auth/roles.ts` (3c48256)
- [x] `requirePermission(perm)` + `resolveKitchenIds(user)` — `backend/src/auth/guard.ts` (3c48256)
- [x] `kitchenScope()` multi-dapur, fail-closed untuk DATA_ADMIN tanpa dapur — `backend/src/lib/scope.ts` (3c48256)
- [x] 403 `forbidden_kitchen`: "Anda tidak memiliki akses ke kitchen ini." — `backend/src/constants/errors.ts`
- [x] `GET /api/me` mengembalikan `permissions` + `kitchens` sesuai scope (untuk dropdown) — `controllers/auth/me.ts`
- [x] Admin API `PATCH /api/admin/users/:id` menerima `kitchenIds`; perubahan role/scope diaudit (dari → ke)
- [x] Role dibaca dari Postgres; claim Auth0 hanya saat provisioning (D-06)
- [x] Permission `mapping:propose` (SUPER_ADMIN, DATA_ADMIN: uploader boleh mengusulkan mapping, PM menyetujui) — `roles.ts` (daec136)
- [x] Test `/api/me`: hanya field shell (tanpa auth0Sub/status/timestamp), kitchen dibatasi scope — `controllers/auth/me.test.ts` (daec136)
- [x] Upload routes memakai `requirePermission` (upload:view / upload:create / batch:review)
- [x] Tulis master Data Reference (`kitchens`, `ingredients`) memakai `requirePermission('reference:edit')`; sebelumnya DATA_ADMIN bisa menulis ingredient — `routes/master/*.ts`, test `routes/master/reference.test.ts` (fix/scrum-20-reference-edit-guard)
- [x] Label role DATA_ADMIN di UI: "Data Operasional" (sesuai tiket) — `frontend-admin/lib/roles.ts`
- [x] Auth0 diganti auth internal (argon2id, sesi Postgres, MFA TOTP) dan peta role → permission pindah ke tabel `role_permissions` (PR #27, `backend/docs/AUTH.md`)

## Sisa pekerjaan
- [ ] Konfirmasi 2 role (B-ROLE). Skema `user_kitchen_scopes`/`kitchens.code` sudah masuk develop lewat PR #27.
- Data rencana: tidak perlu permission baru; SCRUM-123 tidak menampilkannya di UI sama sekali.
## Acceptance criteria
- [x] Akses ke kitchen lain ditolak di API langsung (403 `forbidden_kitchen`)
- [x] Ditolak di UI: menu & halaman difilter permission, selector dapur hanya berisi dapur dalam scope (SCRUM-21)
- [x] Tidak ada PII di respons (`me.test.ts`)
- [x] Test happy path + minimal satu kasus akses ditolak

## Test
- 22 Okt: 109 test lulus, `tsc` bersih (matriks permission, scope multi-kitchen, kitchen di luar scope ditolak, role tidak ditimpa claim, claim tidak bisa mengisi scope).
- 23 Okt: setelah daec136 + rebase rantai: 113/113 lulus, `tsc --noEmit` bersih.
- 25 Okt: 167/167 lulus (termasuk `reference.test.ts`: DATA_ADMIN 403 pada POST/PATCH kitchens & ingredients, PM lolos guard; test gagal bila guard dikembalikan), `tsc --noEmit` bersih.

## Blocker / pertanyaan terbuka
- B-ROLE, B-SCHEMA, B-TUREN (lihat blockers.md)
- Rute master tulis sudah dipindah ke `reference:edit` (25 Okt).

## Skema
- [USULAN, sudah termigrasi] `user_kitchen_scopes`, `kitchens.code` → `SCRUM-20-schema.md`
