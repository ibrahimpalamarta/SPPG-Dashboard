# SCRUM-33: Generic validation framework
Tahap: 4 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Tidak dibuat framework baru: adapter tetap memancarkan `Issue` (`lib/mapping/values.ts`). Satu registry `lib/validation/rules.ts` memberi tiap kode severity + aksi.
- [x] Severity tampil di Validasi Data: "Wajib diperbaiki" = CRITICAL (Blocker), "Perlu dicek" = HIGH/MEDIUM (Warning/Info).
- [x] Detail per baris: `validation_issues` menyimpan kode, rule DQ-xxx, `source_record_id`, pesan (berisi baris + field).
- [x] Kode yang belum terdaftar otomatis HIGH/REVIEW, tidak pernah lolos diam-diam.

## Test
`src/lib/ingest/staging-prisma.test.ts` (issue tersimpan dengan severity)
