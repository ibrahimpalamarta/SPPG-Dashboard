# SCRUM-46: [DATA-013] Build optional Goods Receipt canonical mapping
Tahap: 5 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Tabel `goods_receipt_lines` (migrasi `20261030020000_finance_canonical_tahap5`): receipt_id/line, link PO opsional, ordered/received qty, `qty_match_status` (MATCH/SHORT/OVER, diturunkan adapter), `source_flag` mentah (tidak otoritatif), traceability PRD §7.2. Usulan: `SCRUM-46-schema.md`.

## Catatan
- Tidak ada adapter: berkas Goods Receipt Sukun belum ada. Bukan blocker Phase 1.

## Sisa pekerjaan
- [ ] Profil + adapter GR setelah sampel tersedia
