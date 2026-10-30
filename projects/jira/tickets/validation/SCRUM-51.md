# SCRUM-51: [DATA-018] Generic validation severity & quarantine workflow
Tahap: 4 | Status: IN_PROGRESS (siap review; sisa di Tahap 8) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Severity CRITICAL/HIGH/MEDIUM dan aksi REJECT/REVIEW/NORMALIZE/FLAG per kode (`lib/validation/rules.ts`).
- [x] Tabel `validation_issues` (migrasi `20261030010000_validation_issues`, usulan `SCRUM-51-schema.md`), ditulis satu transaksi dengan staging.
- [x] Karantina: batch dengan CRITICAL yang masih OPEN ditolak ke READY (409 `batch_blocked`, `details.openCritical`). Helper `openBlockers` dipakai ulang oleh publish (SCRUM-95).
- [x] Baris yang ditolak (NO_TXN_ID, INVALID_DATE) tidak masuk kanonik tapi tetap tertelusur lewat `source_record_id` ke staging dan batch.
- [x] Validasi Data: "Tandai sudah dicek" dengan catatan wajib menutup semua issue OPEN satu kode (`POST /api/validation-issues/resolve`, izin `upload:create`), tercatat di audit log.

## Catatan
- Resolve hilang bila berkas di-parse ulang, karena issue ditulis ulang tiap parse.
- Yang menandai: pembuat data (`upload:create`, Data Operasional) selama batch NEEDS_REVIEW. PM tidak memegang izin ini (four-eyes).

## Sisa pekerjaan
- [ ] Hasil karantina tampil di Data Health (SCRUM-104, Tahap 8)

## Test
`src/controllers/upload/upload-batch.test.ts` (karantina), `src/controllers/upload/validation-issue.test.ts`
