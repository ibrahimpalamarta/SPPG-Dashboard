# SCRUM-95: Publish canonical batch
Tahap: 6 | Status: IN_PROGRESS (siap review; B-ROLE) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `POST /api/upload-batches/:id/publish` (`batch:publish`): hanya READY (sudah di-review), tanpa CRITICAL OPEN, dan bukan oleh pengunggahnya sendiri (four-eyes, D-17).
- [x] Idempoten: batch yang sudah PUBLISHED → 200 `alreadyPublished: true` tanpa perubahan. Status dibalik lebih dulu dalam transaksi, jadi publish ganda bersamaan tidak men-supersede dua kali.
- [x] Mengisi `published_at` (dan `validated_at` saat Kirim ke PM); lineage lewat `superseded_by_batch_id` (SCRUM-78).

## Catatan
- **Konflik K-06**: deskripsi Jira tiket ini meminta publish oleh Data Operasional tanpa review Admin, sedangkan SCRUM-117 dan TASKLIST meminta review PM. Yang dibangun: review PM. Menunggu keputusan.

## Test
`src/controllers/upload/review.test.ts`; SQL supersede diverifikasi ke Postgres nyata (schema sementara) dengan txn yang sama/berbeda tanggal dan bahan NULL.
