# SCRUM-20: RBAC 2 role
Tahap: 1 | Status: IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-ROLE) | Terakhir diubah: 2026-10-23 11:00

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

## Sisa pekerjaan
- [ ] `view_planned_data` ditambah di SCRUM-123 (bersama pemakaiannya, B-PLAN).
- [ ] Test: respons `/api/me` tidak memuat PII selain email/nama user sendiri.
- [ ] Penolakan di **UI**: tergantung SCRUM-21 (menu tersembunyi + guard route).
- [ ] Approval skema (B-SCHEMA) dan konfirmasi 2 role (B-ROLE).

## Acceptance criteria
- [x] Akses ke kitchen lain ditolak di API langsung (403 `forbidden_kitchen`)
- [x] Ditolak di UI: menu & halaman difilter permission, selector dapur hanya berisi dapur dalam scope (SCRUM-21)
- [x] Tidak ada PII di respons (`me.test.ts`)
- [x] Test happy path + minimal satu kasus akses ditolak

## Test
- 22 Okt: 109 test lulus, `tsc` bersih (matriks permission, scope multi-kitchen, kitchen di luar scope ditolak, role tidak ditimpa claim, claim tidak bisa mengisi scope).
- 23 Okt: setelah daec136 + rebase rantai: 113/113 lulus, `tsc --noEmit` bersih.

## Blocker / pertanyaan terbuka
- B-ROLE, B-SCHEMA, B-TUREN (lihat blockers.md)
- Catatan: rute master `kitchens` (tulis) dan `ingredients` (tulis) masih `requireRole`. Ingredient bisa ditulis DATA_ADMIN, padahal SCRUM-123 mensyaratkan Data Reference hanya diubah PM. Akan dipindah ke `reference:edit` di SCRUM-123.

## Skema
- [USULAN, sudah termigrasi] `user_kitchen_scopes`, `kitchens.code` → `schema-proposals/SCRUM-20.md`
