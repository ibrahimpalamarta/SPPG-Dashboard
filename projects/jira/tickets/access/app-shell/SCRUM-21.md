# SCRUM-21: App shell & navigation
Fitur: access/app-shell | Tahap: 1 | Status: IN_PROGRESS (sebagian BLOCKED: B-DOCS) | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- `frontend-admin` (Next 16.3, React 19, Tailwind 4, lucide-react). Mockup statis di working tree, belum di-commit: overview/finance/kelengkapan/unggah-data/login.
- Semua angka berasal dari `lib/mock/*`, jadi **angka palsu**. Tidak ada Auth0 maupun guard, dan login hanya pemilih peran.
- Nav tidak sesuai PRD §5. Clickable Prototype v0.2 tidak tersedia (B-DOCS).

## Yang sudah dikerjakan
- [x] Snapshot mockup di-commit apa adanya sebelum diubah (`7702db0`), supaya desainnya tetap bisa dirujuk
- [x] `@auth0/nextjs-auth0` 4.31.1 (D-09); `lib/auth0.ts` (audience = backend API)
- [x] `proxy.ts` (Next 16): rute `/auth/*`, tanpa sesi → `/admin/auth/login?returnTo=…`
- [x] `lib/me.ts`: `GET /api/me` dengan access token, `selectedKitchen()` memvalidasi cookie terhadap scope
- [x] `lib/nav.ts`: 7 halaman PRD §5 + permission per halaman (satu sumber untuk sidebar dan guard)
- [x] `lib/guard.ts` `requirePage()`: tanpa permission → `forbidden()` (HTTP 403, `app/forbidden.tsx`)
- [x] Sidebar + header: menu difilter role, indikator user/role, logout, selector dapur dari `/api/me.kitchens`, menu mobile `<details>` native
- [x] 7 halaman dengan `EmptyState` "belum tersedia" (tanpa angka); Manual / Quick Entry tampil "Nonaktif"
- [x] `app/error.tsx` (gagal memuat `/api/me` dll.)
- [x] Hapus seluruh mock: `lib/mock/*`, komponen finance/kelengkapan/overview/unggah/ui/login, CSS animasi chart
- [x] `.env.example` + README frontend
- [x] Auth0 diganti login internal (email + password, MFA TOTP, cookie `sppg_session`) di PR #27; B-AUTH0-FE tertutup
- [x] Halaman **Inbox** (`/inbox`, `upload:create`: Data Operasional + PM; isi tugas menyusul di SCRUM-117) dan **Anggota** (`/anggota`, `users:read`; menggantikan `/pengguna`) — feature/scrum-21-inbox-anggota
- [x] Tidak ada board Antrian Batch
- [x] Sidebar dikelompokkan (Dashboard / Data / Tools) dan footer nama pengguna diperbaiki; halaman Peran & Izin, Keamanan, dan Integrasi (read-only, OD-08) ditambahkan (c5a93dc)

## Sisa pekerjaan
- [ ] Sesuaikan dengan Clickable Prototype v0.2 bila tersedia (B-DOCS)

## Acceptance criteria
- [x] Halaman Login, Overview, Upload, Mapping & Validasi, Finance, Kelengkapan Data, Data Reference, Manual Entry, Inbox, Anggota ada dan bisa dinavigasi sesuai role
- [x] Deep-link ke halaman terlarang ditolak (HTTP 403)
- [x] Menu terlarang disembunyikan; route ditolak di server (server component, bukan CSS)
- [x] Login internal end-to-end (PR #27)

## Test
Tidak ada test runner di frontend. Diverifikasi manual pada `next start` (build produksi), memakai sesi buatan `@auth0/nextjs-auth0/testing` `generateSessionCookie` dan stub `/api/me` (skrip di scratchpad sesi, tidak di-commit):
1. Tanpa sesi `/admin/overview` → 307 ke `/admin/auth/login?returnTo=%2Fadmin%2Foverview` ✔
2. DATA_ADMIN: 200, 7 link nav, label "Data Admin Dapur", selector "SKN · Sukun", empty state ✔
3. INTERNAL: 6 link (tanpa Manual Entry); deep-link `/admin/input-manual` → **403** "Anda tidak memiliki akses ke halaman ini" ✔; `/admin/referensi-data` → 200 ✔
4. PUBLIC (tanpa permission): `/admin/overview` → 403 ✔
5. Cookie dapur `kitchen=999` (di luar scope) → selector jatuh ke dapur pertama dalam scope ✔
6. `/admin/auth/login` dengan domain dummy → 500 (discovery gagal, bukti rute terpasang; butuh tenant nyata)
- `npm run lint` ✔, `npm run knip` ✔, `tsc --noEmit` ✔, `npm run build` ✔

- 25 Okt (Inbox/Anggota): `npm run lint` ✔, `npm run knip` ✔, `tsc --noEmit` ✔, `npm run build` ✔ (rute `/inbox`, `/anggota` terdaftar). E2E qa-audit `rbac.spec.ts` diperbarui: Inbox hanya terlihat oleh role yang bisa memasukkan data, deep-link `/anggota` → 403.

Temuan saat test: `loading.tsx` di `(app)` membuat respons ter-stream lebih dulu sehingga `forbidden()` memberi 200, bukan 403. Berkas itu dihapus (D-11).

## Blocker / pertanyaan terbuka
- B-DOCS, B-NEXT-CVE (lihat blockers.md)

## Skema
- Tidak ada.
