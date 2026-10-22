# SCRUM-5: Halaman Upload Data
Tahap: 2 | Status: IN_PROGRESS | Terakhir diubah: 2026-10-23 10:00

## Kondisi awal (hasil audit kode)
- Backend: `POST /api/upload-batches` lengkap (kitchen, domain, period, file; duplikat → warning).
- Frontend: `app/(app)/unggah-data/page.tsx` + `components/unggah/upload-history.tsx` dari mockup, dengan data palsu (`lib/mock/unggah-data.ts`) dan tanpa pemanggilan API.

## Yang sudah dikerjakan
- [x] API upload (SCRUM-22)

## Sisa pekerjaan
- [ ] Form: kitchen (scope), domain, periode, file → API
- [ ] Nama/ukuran berkas, "Belum terdeteksi" untuk profile
- [ ] Status + tautan ke history dan Mapping & Validation
- [ ] Peringatan duplikat, pesan error PRD §9

## Acceptance criteria
- [ ] AC-UP-01, FR-UP-01, FR-UP-05

## Test
- (belum)

## Blocker / pertanyaan terbuka
- B-UPLOADER, bergantung pada SCRUM-21 (shell + auth)

## Skema
- Tidak ada baru.
