# SCRUM-78: [DATA-045] Idempotent publish + supersede lineage model
Tahap: 6 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Kunci bisnis deterministik per tabel kanonik (D-18), di `supersedePublished` (`backend/src/lib/publish.ts`): finance kitchen+txn_id+txn_date, RAB kitchen+tanggal+segmen, menu kitchen+tanggal+segmen+menu+bahan, payment kitchen+payment_request_id. Kolom nullable dibandingkan `IS NOT DISTINCT FROM`.
- [x] Saat publish, baris batch PUBLISHED sebelumnya dengan kunci sama diberi `superseded_by_batch_id`; tidak dihapus, jadi lineage lama tetap bisa di-query.
- [x] Kolom `superseded_by_batch_id` di `finance_transactions`, `rab_daily_budgets`, `menu_recipe_lines`, `vendor_payment_workflows` (migrasi `20261030030000_publish_lineage`, usulan `SCRUM-78-schema.md`).

## Test
`src/controllers/upload/review.test.ts`; verifikasi SQL ke Postgres nyata: T1/Mei tergantikan, T2/Mei dan T1/Juni tidak, panggilan kedua 0 baris.
