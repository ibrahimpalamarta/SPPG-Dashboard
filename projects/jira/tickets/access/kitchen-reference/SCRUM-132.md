# SCRUM-132: [DATA-052] Dapur reference & rollout-status metadata untuk filter
Fitur: access/kitchen-reference | Tahap: 3 (ditarik maju) | Status: IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-LWG, B-TUREN) | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- Tabel `kitchens` ada di develop (ERD): name, wilayah, type, status ACTIVE/INACTIVE.
- `kitchens.code` (SKN/LWG/DNM/PCK/SML) ditambah di branch SCRUM-20 (lokal). Turen tanpa kode.
- `GET /api/kitchens` ada. Belum ada `bucket`, `rollout_status`, atau helper filter.

## Yang sudah dikerjakan
- [x] `KITCHEN_ROLLOUT` (config, kunci = kode) + `withRollout()` + `codesByRolloutStatus()` — `backend/src/lib/kitchen-rollout.ts`
- [x] `GET /api/kitchens` dan `/:id` mengembalikan `bucket`, `rolloutStatus`; filter `?rolloutStatus=` (zod enum) — `controllers/master/kitchen.ts`, `schemas/kitchen.ts`
- [x] Data Reference: tabel master dapur read-only (kode, nama, bucket, tahap rollout, status); nilai kosong tampil "Belum ditetapkan", bukan tebakan — `frontend-admin/app/(app)/referensi-data/page.tsx`
- [x] `frontend-admin/lib/api.ts` `apiGet()` (dipakai `getMe` dan Data Reference)

## Sisa pekerjaan
- [ ] Persetujuan kolom (B-SCHEMA) → pindah dari config ke kolom; kontrak API tetap
- [ ] Konfirmasi OD-01 Lawang (B-LWG), kode Turen (B-TUREN)
- [x] Edit oleh PM: tombol Ubah (nama, status) di Data Reference, `reference:edit` (SCRUM-123)

## Acceptance criteria
- [x] Seluruh dropdown/filter kitchen memakai sumber yang sama. Dropdown dapur di header memakai `GET /api/me.kitchens` (tabel `kitchens`, dibatasi `resolveKitchenIds`). Filter rollout memakai `GET /api/kitchens` (tabel yang sama + config yang sama). Tidak ada daftar dapur hardcode di frontend.
- Catatan: `kitchensForUser` tidak dibuat sebagai helper baru; perannya sudah dipegang `resolveKitchenIds()` + `/api/me` (SCRUM-20).

## Test
- `src/lib/kitchen-rollout.test.ts`: bucket/stage per kode, Turen → NULL, `codesByRolloutStatus('PHASE_2A')` = DNM+PCK, filter endpoint → `where.code.in`. Backend 117/117 lulus, `tsc` bersih.
- Frontend: lint/knip/tsc/build bersih. Render `/admin/referensi-data` dengan stub API → 200, Lawang "Pembanding Phase 1", Turen "Belum ditetapkan".
- 25 Okt (review Tahap 1): AC kode terpenuhi. kitchen_id + label stabil (kode SKN/LWG/DNM/PCK/SML), Turen `rolloutStatus` NULL (non-production), filter per tahap rollout, nilai kosong "Belum ditetapkan" (bukan 0). Pengelompokan region memakai kolom `province`/`cityRegency` yang masih kosong sampai master dapur diterima. Sisa hanya keputusan.

## Blocker / pertanyaan terbuka
- B-SCHEMA, B-LWG, B-TUREN

## Skema
- [USULAN] `kitchens.bucket`, `kitchens.rollout_status` → `SCRUM-132-schema.md` (tidak dimigrasi)
