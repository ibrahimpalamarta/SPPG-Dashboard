# SCRUM-59: [DATA-026] Create government_submission_log and dedup lineage
Tahap: 6 | Status: IN_PROGRESS (siap review) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Tabel `government_submission_logs`: sistem (SIPGN/POP/AKSIS), modul, `source_record_id`, status (SUBMITTED/ACCEPTED/REJECTED), waktu kirim, referensi eksternal, pencatat. UNIQUE (sistem, modul, source_record_id) = dedup: kirim ulang memperbarui baris, tidak menambah fakta.
- [x] `POST /api/government-submissions` (`batch:publish`): `source_record_id` wajib ada di staging; dapur diambil dari batch-nya (kitchen scope). `GET` (`upload:view`) dengan filter dapur/sistem/record.
- [x] KPI tidak pernah membaca tabel ini, jadi salinan yang dilaporkan tidak dihitung dua kali.

## Catatan
- Belum ada UI pencatatan; API saja.
