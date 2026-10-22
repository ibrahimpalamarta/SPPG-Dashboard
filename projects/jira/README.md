# Pelacakan Jira — SPPG Internal Dashboard Phase 1

Folder ini adalah catatan kondisi **kode nyata** per tiket. Status resmi di Jira
diubah oleh tim; folder ini yang dijaga akurat oleh engineer dan di-commit
bersama kode tiketnya.

| Berkas | Isi |
|---|---|
| `STATUS.md` | Ringkasan semua tiket Tahap 1–3 |
| `blockers.md` | Blocker aktif + riwayat yang sudah selesai |
| `decisions.md` | Keputusan, asumsi, temuan konflik dokumen |
| `tickets/SCRUM-xx.md` | Satu berkas per tiket yang sudah disentuh |
| `schema-proposals/SCRUM-xx.md` | Usulan skema yang belum tertulis di PRD/Data Dictionary |

## Legenda status

- `TODO`: belum ada kode untuk tiket ini.
- `IN_PROGRESS`: sebagian sudah ada. Berkas tiket mencatat sisa pekerjaannya.
- `DONE`: **semua** acceptance criteria terpenuhi dan test lulus.
- `BLOCKED`: tidak bisa maju tanpa input dari luar. Wajib punya entri di `blockers.md`.
- `DUPLICATE`: tidak dikerjakan; rujuk tiket aslinya.

Satu tiket bisa `IN_PROGRESS` dengan sebagian pekerjaan `BLOCKED`. Kalau begitu,
STATUS menulis keduanya, misalnya `IN_PROGRESS (sebagian BLOCKED: B-SCHEMA)`.

## Aturan skema

- **[PRD]**: tertulis di PRD §7 / Data Dictionary v0.2, atau sudah ada di `schema.prisma` di develop. Boleh langsung dimigrasi.
- **[USULAN]**: selain itu. Tulis proposal di `schema-proposals/`, jangan buat migrasi, dan pakai interface + implementasi in-memory sampai disetujui.

## Kapan diperbarui

Saat mulai tiket, tiap langkah bermakna, saat menemukan blocker/asumsi, dan saat selesai.
