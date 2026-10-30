# SCRUM-54: [DATA-021] Production eligibility based on review_status
Tahap: 6 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `ELIGIBLE_REVIEW_STATUSES = ['TERKONFIRMASI']` (baseline) di `backend/src/lib/publish.ts`, satu sumber untuk publish dan KPI (Tahap 7). Keputusan: D-19.
- [x] Baris non-eligible tidak dihapus dan tetap terlihat di Validasi Data (issue NEEDS_REVIEW DQ-025); hanya tidak dihitung KPI.
- [x] Publish mencatat jumlah transaksi eligible di audit log.

## Catatan
- "Bisa dikonfigurasi" = konstanta kode (berubah lewat deploy). Pindahkan ke Data Reference bila Finance perlu mengubahnya tanpa rilis.
