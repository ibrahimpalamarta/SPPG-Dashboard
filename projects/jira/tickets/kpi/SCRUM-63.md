# SCRUM-63: [DATA-030] Build Expense Mix semantic query
Tahap: 7 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Σ `txn_total` spend per `category_normalized` (Master Reference, SCRUM-42). Kategori tak termapping dikumpulkan di `unmapped` (di-flag), tetap masuk total, jadi total = spend.

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
