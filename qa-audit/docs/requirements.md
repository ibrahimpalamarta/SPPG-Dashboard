# Pemetaan requirement

Daftar ada di [`requirements.json`](../requirements.json):

| Kolom | Isi |
|---|---|
| `source` | `prd` atau `jira` |
| `id` | ID PRD (AC-*, P1-0xx, OD-xx, ERR-xx) atau key Jira (`SCRUM-xx`) |
| `title`, `ac` | Judul dan acceptance criteria (dikutip dari sumber) |
| `priority` | `P0`, `P1`, atau `decision` (OD) |
| `target` | Tanggal akhir kolom Target backlog PRD §16.2; dasar eskalasi QD-02 |
| `refs` | ID terkait (tiket P1, SCRUM, OD) |

## Konvensi
- Judul test: `[ID] deskripsi singkat @tag`, boleh beberapa ID: `[P1-001][SCRUM-20] ... @smoke @rbac`.
- Hanya beri ID yang **benar-benar** dibuktikan test itu. Unit test state machine bukan bukti
  AC-UP-03 end-to-end.
- `ERR-01`..`ERR-08` = delapan skenario PRD §9 (Error States), diberi ID oleh qa-audit karena PRD
  tidak memberinya. Urutannya sama dengan tabel PRD.
- KPI yang menunggu OD-02/03/04 ditulis `test.fixme` dengan ID OD di judul →
  *Menunggu keputusan*. Saat OD diputuskan: hapus `fixme`, isi expected sesuai keputusan,
  ubah `priority` entri OD dari `decision` menjadi `P0`, dan catat keputusannya di decision log.

## Cakupan saat ini
P0 yang wajib punya test (DoD): AC-UP-01..03, AC-MAP-01, AC-DQ-01..04, AC-PUB-01..02,
AC-DASH-01..05, AC-HEALTH-01, AC-TRACE-01, AC-PRIV-01, P1-001, ERR-01..08, P1-034, plus
evidence P1-031 dan P1-033. Status terkini ada di scorecard.

## Menambah requirement
1. Tambah entri ke `requirements.json` (ID unik; kutip AC apa adanya).
2. Tulis test dengan ID di judul, atau `test.fixme` bila fitur belum ada.
3. Jalankan `npm run report` dan cek status di scorecard.
4. ID dari Jira: `source: "jira"`, `id: "SCRUM-xx"`; tiket di `projects/jira/tickets/` bila ada.

## Jira
Sinkronisasi otomatis (tarik tiket per sprint/label/epic, komentar hasil ke tiket) ditunda ke
fase 5 (QD-07). Perubahan status tiket tetap manual.
