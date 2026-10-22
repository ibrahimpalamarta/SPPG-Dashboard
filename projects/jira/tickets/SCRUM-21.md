# SCRUM-21: App shell & navigation
Tahap: 1 | Status: IN_PROGRESS | Terakhir diubah: 2026-10-23 10:00

## Kondisi awal (hasil audit kode)
- `frontend-admin` (Next 16.3, React 19, Tailwind 4, lucide-react). Mockup di working tree `feature/admin-overview-mockup`, belum di-commit: layout `(app)` dengan sidebar + header, halaman overview/finance/kelengkapan/unggah-data/login.
- Semua angka berasal dari `lib/mock/*`, jadi **angka palsu**.
- Tidak ada Auth0, tidak ada guard, dan login berupa pemilih peran (bukan autentikasi).
- Nav tidak sesuai PRD §5 (ada "Rekonsiliasi", "Pelaporan"; tidak ada Data Health, Data Reference, Manual Entry).
- Clickable Prototype v0.2 tidak tersedia (B-DOCS).

## Yang sudah dikerjakan
- (belum)

## Sisa pekerjaan
- [ ] Auth0 session di frontend + guard
- [ ] 7 halaman PRD §5 + empty state "Belum tersedia"
- [ ] Nav dan guard dari satu config permission
- [ ] Selector kitchen dari `/api/me.kitchens`, indikator user/role
- [ ] Hapus mock data

## Acceptance criteria
- [ ] 7 halaman bisa dinavigasi sesuai role
- [ ] Deep-link ke halaman terlarang ditolak

## Test
- (belum)

## Blocker / pertanyaan terbuka
- B-DOCS (prototype)

## Skema
- Tidak ada.
