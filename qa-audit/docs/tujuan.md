# Tujuan, ruang lingkup, asumsi, prinsip

## Tujuan
`qa-audit` memberi **satu verdict** per run — aman di-merge atau tidak — beserta bukti:

- keputusan lulus/gagal yang konsisten (aturan di satu file, [`gate.json`](../gate.json));
- bukti bahwa aturan PRD berlaku: missing ≠ 0, `transaction_total` tidak dijumlah per baris,
  label Rencana/RAB-based, RBAC + kitchen scope, PII, idempotency re-upload;
- regresi UI dan aksesibilitas tertangkap sebelum pilot;
- evidence demo dan UAT (P1-031, P1-033) tanpa dikumpulkan manual;
- biaya rendah: tanpa server permanen, hanya runner CI atau laptop.

## Ruang lingkup
| Termasuk | Tidak termasuk |
|---|---|
| `backend/`, `frontend-admin/` (type check, lint, Semgrep, gitleaks, E2E) | `frontend-public/` (masih "Segera Hadir"; dibangun oleh `ci.yml`) |
| Postgres sementara di runner/laptop | Production — dilarang, ada guard |
| Staging milik sendiri, hanya untuk ZAP mingguan (fase 4) | E2E ke staging (fase 5) |
| Usulan kontrak `data-testid` | Mengubah kode aplikasi |

## Sumber requirement
- PRD SPPG Internal Dashboard v0.1 (8 Okt 2026), Drive `1kBwyixbJadujNz0pT1dfJCZ6LIMwJXgbdw5TW0KJqpc`.
  ID AC-*, FR-*, US-*, P1-0xx, OD-xx berasal dari sini.
- BRD for Internal Recommendation v.2, Drive `1Zy1Mms_v1n327zDs11nJQC6p4JF-__di`.
- Tiket Jira project `SCRUM` (lihat `projects/jira/` di root repo).

## Asumsi (dikonfirmasi 25 Okt 2026, rincian di [decision-log.md](decision-log.md))
- qa-audit adalah folder di repo aplikasi (`qa-audit/`), dengan `package.json` sendiri.
- Login aplikasi = auth internal (email + password, MFA TOTP opsional per role), bukan Auth0.
- Role PRD dipetakan ke role kode yang ada (QD-03).
- OD-02, OD-03, OD-04 masih open → test terkait `fixme`, tampil *Menunggu keputusan*.
- Fitur yang belum dibangun → test `fixme` *Menunggu fitur*, jadi Blocker setelah tanggal target (QD-02).

## Prinsip
1. Hanya jalan di CI atau laptop. Hanya Chromium. Satu toolchain TypeScript lewat npm.
2. Fail-fast: tahap murah dulu; Blocker di code audit melewati tahap 2–5, laporan tetap dibuat.
3. Bahasa PRD: severity **Blocker / Warning / Info**; nama test memuat ID requirement.
4. Deterministik: fixture dibuat script, data dinamis di-mask, animasi mati, baseline screenshot hanya dari CI.
5. Tidak pernah menyentuh production: [`scripts/guard.ts`](../scripts/guard.ts) menolak host selain
   localhost dan `QA_STAGING_URL`.
6. Tool hanya mengumpulkan data; hanya `merge-report` yang menerapkan aturan gate.
