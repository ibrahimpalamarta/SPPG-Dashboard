# SCRUM-101: Account Balance widget
Tahap: 7 | Status: IN_PROGRESS (sebagian BLOCKED: B-SRC-SKN, OD-02) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Kartu Saldo + stat Overview. Draft/resmi disimpan di backend (`balance.status`), tanpa label "Belum resmi" di layar (sesuai deskripsi Jira); "-" + "Belum ada data saldo yang dipublish" bila kosong. Tombol keputusan yang mati dihapus.

## Sisa pekerjaan
- [ ] AI Insight hari operasional (di luar lingkup Tahap 7).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
