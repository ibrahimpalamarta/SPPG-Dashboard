# SCRUM-117: Review & approval workflow PM
Tahap: 6 | Status: IN_PROGRESS (siap review; B-ROLE) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Alur di atas status yang ada (tanpa enum baru, D-17): NEEDS_REVIEW (dicek Data Operasional) → `POST /api/upload-batches/:id/submit` → READY = "Menunggu Review PM" → `POST /:id/return` (catatan wajib, kembali ke NEEDS_REVIEW + `errorCode RETURNED` = "Dikembalikan") atau `POST /:id/publish`.
- [x] Kirim ke PM ditolak selama ada temuan CRITICAL yang OPEN (409 `batch_blocked`).
- [x] Inbox: PM (`batch:publish`) melihat "Menunggu Review PM" (READY); Data Operasional (`upload:create`) melihat berkas dikembalikan beserta catatannya di "File ditahan atau dikembalikan".
- [x] Semua langkah tercatat di audit log (`upload_batch.submitted` / `.returned` / `.published`) dan tampil di tab Riwayat.
- [x] Validasi Data: tombol Kirim ke PM / Kembalikan (dengan alasan) / Publish (`components/mapping/review-actions.tsx`), banner "Dikembalikan PM: …".

## Test
`src/controllers/upload/review.test.ts`
