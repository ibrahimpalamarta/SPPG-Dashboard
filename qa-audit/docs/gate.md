# Gate, severity, waiver, flaky

Semua aturan ada di [`gate.json`](../gate.json) dan hanya dibaca `scripts/merge-report.ts`.
Mengubahnya wajib disertai entri di [decision-log.md](decision-log.md).

## Severity
| Blocker (check merah, merge diblok) | Warning (dilaporkan) | Info |
|---|---|---|
| Error tipe (tsc), termasuk `noUnused*` | Semgrep WARNING non-keamanan | Saran lint (ESLint warning) |
| Secret (gitleaks) | ESLint error (QD-15), semua rule useEffect, temuan knip (QD-33) | Tool tidak terpasang di laptop |
| Semgrep ERROR atau rule ber-tag `security` (QD-31) | Test flaky (lolos setelah 1 retry) | Test fixme menunggu keputusan |
| Test Vitest gagal | Test Playwright gagal di luar smoke/rbac/pii | Perubahan kecil skor (fase 3) |
| Test smoke/rbac/pii gagal, login setup gagal | Diff visual > ambang (fase 3) | |
| axe critical/serious (fase 2) | Lighthouse < ambang (fase 3) | |
| Environment gagal siap (`infra-error`) | axe moderate/minor | |
| Tool wajib hilang/crash di CI (`infra-error`) | Trivy/ZAP medium (fase 4) | |
| Tahap gagal tanpa laporan | `jsx-a11y` tidak aktif | |
| Trivy/ZAP high/critical (fase 4) | Generator tipe (prisma/next) gagal | |
| P0 *Menunggu fitur* atau *Belum ada test* lewat tanggal target | | |
| Waiver kedaluwarsa, waiver tidak lengkap, waiver pada secret | | |

Ambang awal: Lighthouse performa 0.8, aksesibilitas 0.9; diff visual 1%. Dikalibrasi setelah
2 minggu data nightly.

## Waiver
Tambahkan ke `waivers` di `gate.json`:
```json
{ "match": "semgrep:sppg-raw-sql-unsafe:backend/src/foo.ts", "reason": "format() %I/%L, aman", "owner": "ItsMauls", "expires": "2026-12-31" }
```
- `match` dicocokkan sebagai **awalan** dari `<tool>:<rule>:<lokasi>` (lihat kolom Tool/Rule/Lokasi scorecard).
- `reason`, `owner`, `expires` (YYYY-MM-DD) wajib; kurang satu → Blocker `waiver-invalid`.
- Lewat `expires` → temuan kembali Blocker.
- Temuan `gitleaks` tidak bisa di-waive (`unwaivable`); mencoba → Blocker `waiver-forbidden`.
  Secret yang bocor harus dirotasi dan dihapus dari riwayat.
- Owner default untuk waiver baru: ItsMauls (QD-06).

## Kebijakan flaky
- CI: retry 1 (`playwright.config.ts`). Lolos setelah retry = *flaky* = Warning.
- Flaky > 2 kali dalam 7 hari → beri tag `@quarantine` lewat PR (dilewati di PR, tetap jalan
  nightly) dan buka issue perbaikan. Deteksi otomatis dari riwayat nightly masuk fase 3;
  penandaan tetap manual (QD-25).

## Status requirement
| Status | Arti |
|---|---|
| Lulus | Semua test ber-ID itu lulus |
| Gagal | Minimal satu gagal |
| Belum ada test | Tidak ada test dengan ID itu |
| Menunggu keputusan | ID OD-xx, atau test fixme yang memuat ID OD-xx |
| Menunggu fitur | Test fixme karena fitur belum dibangun (QD-02) |
| Tidak dijalankan | Test ada tetapi tidak termasuk suite run ini |
