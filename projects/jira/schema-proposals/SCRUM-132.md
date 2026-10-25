# Usulan skema — SCRUM-132 (bucket & rollout status dapur)

Status: **USULAN, tidak dimigrasi.** Sementara memakai konstanta `KITCHEN_ROLLOUT` di `backend/src/lib/kitchen-rollout.ts`, dengan kode dapur sebagai kunci.

| Kolom (`kitchens`) | Tipe | Null | Nilai | Alasan |
|---|---|---|---|---|
| `bucket` | SMALLINT | ya | 1 = 4 dapur Malang, 2 = Simalungun | BRD §1 "Bucket 1/2"; filter Data Health per bucket |
| `rollout_status` | ENUM `PILOT_PHASE_1`, `PHASE_1_COMPARISON`, `PHASE_2A`, `PHASE_2B` | ya | PRD §14 | Filter dropdown/Data Health per tahap; PM mengubahnya tanpa deploy (SCRUM-123) |

**Rujukan.** PRD §14 (tahap rollout), BRD §1 (bucket), BRD G7 (master dapur dibangun pusat).

**Kenapa belum dimigrasi.** Kolom tidak tertulis di PRD §7 maupun ERD, dan Data Dictionary v0.2 (sheet master) belum tersedia (B-DOCS). Nilai Lawang juga masih open (OD-01, B-LWG).

**Alternatif tanpa kolom (yang dipakai sekarang).** Konstanta di kode yang dibaca `GET /api/kitchens` (field `bucket`, `rolloutStatus`, filter `?rolloutStatus=`). Kekurangannya, perubahan butuh deploy dan tidak tercatat di audit log. Kalau usulan disetujui, kontrak API tetap sama: cukup ganti sumber nilai di `withRollout()`.
