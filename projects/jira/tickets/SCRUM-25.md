# SCRUM-25: Upload history/status
Tahap: 2 | Status: IN_PROGRESS | Terakhir diubah: 2026-10-23 10:00

## Kondisi awal (hasil audit kode)
- Backend: `GET /api/upload-batches` (filter kitchenId, status, rentang tanggal; pagination `src/lib/pagination.ts`; scope server-side) dan `GET /api/upload-batches/:id`.
- Filter `domain` sudah ada (SCRUM-22). Belum: unduh berkas asli.
- Frontend: tabel history mockup dengan data palsu.

## Yang sudah dikerjakan
- [x] List + detail API dengan scope kitchen

## Sisa pekerjaan
- [ ] Unduh berkas asli (yang berhak), polling PROCESSING
- [ ] UI tabel + detail
- [ ] Kolom hasil validasi / waktu publish (nullable; sudah ada `validated_at`, `published_at`)

## Acceptance criteria
- [ ] FR-UP-06 minimum: file, batch, kitchen, domain, uploader, waktu, status, mapping profile

## Test
- (belum)

## Blocker / pertanyaan terbuka
- Bergantung pada SCRUM-21

## Skema
- Tidak ada baru.
