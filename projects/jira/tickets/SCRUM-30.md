# SCRUM-30: Sukun Payment adapter MAP-SKN-PAY-001
Tahap: 3 (label Jira: stage-4) | Status: IN REVIEW | Terakhir diubah: 2026-10-28

## Yang sudah dikerjakan
- [x] `applyInputMaker`: tiap baris Input Maker mendapat `payment_request_id` stabil (`PAY-SKN-` + hash isi baris + sheet; baris identik dalam satu sheet diberi akhiran `-2`, `-3`), sama untuk berkas yang diunggah ulang.
- [x] Hasil disimpan saat upload ke `vendor_payment_workflows` (migration `20261028000000_vendor_payment_workflow`), satu transaksi dengan staging; internal-only.
- [x] TAGIHAN = `request_amount` (diminta, bukan dibayar). `maker_input_at`, `approved_at`, `paid_at`, `paid_amount`, `payment_reference` NULL: tidak ada bukti andal di sumber (OD-14).
- [x] Constraint DB: `paid_at` terisi ⇒ `payment_reference` wajib (SCRUM-47).
- [x] Kolom bank tetap tidak di-stage dan tidak dipetakan.

## Belum
- Link ke PO/receipt (SCRUM-47): tidak ada sumber PO/GR Sukun (B-SRC-SKN).
- Migration sudah dijalankan ke Postgres lokal (2026-10-28).

## Test
`src/lib/mapping/input-maker.test.ts`, `src/lib/ingest/staging-prisma.test.ts`
