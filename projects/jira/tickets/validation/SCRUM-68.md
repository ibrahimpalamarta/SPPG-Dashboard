# SCRUM-68: [DATA-035] Expose validation queue for rejected/review records
Tahap: 4 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `GET /api/validation-issues` (`upload:view`): filter dapur, batch, kode rule, severity, status; kitchen scope; paginated; tiap item membawa `source_record_id` dan batch asal.
- [x] Auto-fix terlihat di tab "Dirapikan otomatis" (normalisasi) Validasi Data.
- [x] Proses ulang: tandai sudah dicek (`POST /api/validation-issues/resolve`) atau unggah ulang berkas perbaikan dengan `replaces` (batch lama → SUPERSEDED).

## Catatan
- Antrean lintas batch belum punya halaman sendiri; Validasi Data menampilkan temuan per batch. Endpoint siap dipakai Data Health (Tahap 8).

## Test
`src/controllers/upload/validation-issue.test.ts`
