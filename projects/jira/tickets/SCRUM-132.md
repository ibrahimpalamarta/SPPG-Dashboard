# SCRUM-132: [DATA-052] Dapur reference & rollout-status metadata untuk filter
Tahap: 3 (ditarik maju) | Status: IN_PROGRESS | Terakhir diubah: 2026-10-23 10:00

## Kondisi awal (hasil audit kode)
- Tabel `kitchens` ada di develop (ERD): name, wilayah, type, status ACTIVE/INACTIVE.
- `kitchens.code` (SKN/LWG/DNM/PCK/SML) ditambah di branch SCRUM-20 (lokal). Turen tanpa kode.
- `GET /api/kitchens` ada (`routes/master/kitchen.ts`).
- Belum ada: `bucket`, `rollout_status`, helper filter.

## Yang sudah dikerjakan
- [x] Master dapur + kode (SCRUM-20)

## Sisa pekerjaan
- [ ] bucket + rollout_status sebagai config (kolom = [USULAN])
- [ ] Helper `kitchensForUser`, `kitchensByRolloutStatus`
- [ ] Tampil read-only di Data Reference

## Acceptance criteria
- [ ] Seluruh dropdown/filter kitchen memakai sumber yang sama

## Test
- (belum)

## Blocker / pertanyaan terbuka
- B-LWG (OD-01), B-TUREN

## Skema
- [USULAN] kolom `bucket`, `rollout_status`: proposal ditulis saat tiket dikerjakan.
