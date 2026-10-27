# SCRUM-25: Upload history/status
Fitur: upload/ui | Tahap: 2 | Status: IN REVIEW | Terakhir diubah: 2026-10-27

## Kondisi awal (hasil audit kode)
- Backend: `GET /api/upload-batches` (filter kitchenId, status, rentang tanggal; pagination `src/lib/pagination.ts`; scope server-side) dan `GET /api/upload-batches/:id`.
- Filter `domain` sudah ada (SCRUM-22). Belum: unduh berkas asli.
- Frontend: tabel history mockup dengan data palsu (diganti, lihat bawah).

## Yang sudah dikerjakan
- [x] List + detail API dengan scope kitchen
- [x] Tabel history nyata di halaman Unggah Data (`components/unggah/upload-history.tsx`): File, Dapur, Jenis data, Diunggah oleh, Waktu, Status (badge, termasuk "Ditahan · file kosong" dan "Diganti"), Profil mapping, Divalidasi, Dipublish (6a6d2dc)
- [x] Tombol buka per baris ke `/mapping-validasi?batch=<publicId>` untuk role yang punya akses mapping

## Sisa pekerjaan
- [ ] Unduh berkas asli (yang berhak)
- [ ] Polling PROCESSING: tidak perlu selama upload sinkron (lihat SCRUM-24)

## Acceptance criteria
- [x] FR-UP-06 minimum: file, batch, kitchen, domain, uploader, waktu, status, mapping profile
- [x] Hasil validasi dan waktu publish tampil (kolom nullable; terisi saat SCRUM-23/34 selesai)

## Test
- Backend: test list/detail di `upload-batch.test.ts`.
- Frontend: lint/knip/tsc/build bersih.

## Blocker / pertanyaan terbuka
- Tidak ada.

## Skema
- Tidak ada baru.
