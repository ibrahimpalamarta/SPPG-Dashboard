# SCRUM-49: [DATA-016] Create finance_balance dataset with source-of-truth guard
Tahap: 5 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN, OD-02) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Tabel `finance_balances`: satu saldo per batch × tanggal × label rekening (`account_ref`, bukan nomor rekening), `source_system`, traceability PRD §7.2. Usulan: `SCRUM-46-schema.md`.

## Catatan
- Tidak ada writer: sumber saldo harian Sukun belum ada dan source-of-truth (OD-02) belum disetujui. KPI Saldo (SCRUM-65) membaca tabel ini dan tetap Draft/Belum ada data.

## Sisa pekerjaan
- [ ] Adapter sumber saldo + keputusan OD-02
