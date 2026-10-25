# Workflow CI

Semua tahap ada di satu workflow reusable, [`qa-audit.yml`](../../.github/workflows/qa-audit.yml).
Tiap trigger punya wrapper tipis; setup (Node 24, Python + Semgrep 1.180.0, gitleaks 8.30.1,
`npm ci` tiga folder, Chromium) ada di composite action
[`qa-setup`](../../.github/actions/qa-setup/action.yml).

| Wrapper | Trigger | Suite | Lighthouse | Enforce | Status |
|---|---|---|---|---|---|
| `qa-pr.yml` | PR ke `develop`, `staging`, `main` | smoke | – | ya | **aktif (fase 1)** |
| `qa-nightly.yml` | cron `0 18 * * *` (01:00 WIB), default branch | full | ya | ya, issue otomatis | fase 3 |
| `qa-weekly.yml` | cron `0 19 * * 6` (Minggu 02:00 WIB) | security | – | ya, issue otomatis | fase 4 |
| `qa-manual.yml` | `workflow_dispatch` | smoke/full/uat/baseline | opsional | nonaktif untuk baseline | fase 2 |

Cron GitHub memakai UTC dan hanya jalan dari default branch (`main`).

## Input workflow reusable
| Input | Default | |
|---|---|---|
| `trigger` | – | `pr`, `nightly`, `weekly`, `manual` |
| `suite` | `smoke` | diteruskan sebagai `QA_SUITE` |
| `enforce` | `true` | `false` → `ENFORCE=0` |
| `security-full` | `false` | gitleaks seluruh riwayat + Semgrep `p/default` |
| `retention-days` | `30` | mingguan memakai 90 |

## Step 0. CI build
Menggantikan check `backend`, `frontend (*)`, `terraform` dari `ci.yml` di PR (QD-29): `npm run build && npm test`
di `backend`, `npm ci && npm run build` di `frontend-public`, `terraform fmt -check` + `validate` tiga folder `infra/`.
frontend-admin sudah dibangun di tahap 3. Tidak ikut fail-fast; hasilnya `OUTCOME_CI`, gagal → Blocker `ci-failed`,
verdict `fail`. Detail error ada di log step itu. `ci.yml` kini hanya jalan pada push ke `develop`.

## Kenapa semua step `continue-on-error`
Supaya **hanya** step "6. Report & gate" yang menentukan warna check. `steps.<id>.outcome` tetap
berisi hasil asli (`success|failure|skipped|cancelled`) dan dikirim sebagai `OUTCOME_*`, sehingga
environment yang gagal menjadi `infra-error`, bukan kegagalan produk. Test non-smoke yang gagal
(Warning) tidak membuat check merah.

## Output CI
- Artifact `qa-audit-<trigger>-<attempt>`: seluruh `qa-audit/reports/` (verdict, scorecard,
  laporan Playwright + trace, raw, `env.log`). `.auth/` tidak ikut.
- Satu komentar PR ber-marker `<!-- qa-audit -->`, diperbarui tiap run (bukan dibuat ulang).
  PR dari fork tidak punya izin tulis; step ini `continue-on-error`.
- Step `AI review` (QD-30, hanya saran): bila ada Blocker/Warning, temuan + diff PR dikirim ke
  `AI_MODEL`, jawabannya ditambahkan sebagai "Analisis AI" di komentar PR, `scorecard.html`, dan
  `reports/ai-review.md`. Tidak pernah mengubah verdict; tanpa `AI_API_KEY` (mis. PR dari fork) dilewati.

## Secret dan variable
| Nama | Jenis | Dipakai | Status |
|---|---|---|---|
| `QA_SEED_PASSWORD` | secret | opsional; tanpa ini password acak per run | belum dibutuhkan |
| `QA_STAGING_URL` | variable | ZAP mingguan, fase 5 | fase 4 |
| `QA_S3_BUCKET`, `QA_S3_ROLE_ARN`, `AWS_REGION` | variable | publikasi scorecard ke S3 privat | ditunda (QD-20) |
| `JIRA_*` | secret | sinkronisasi Jira | fase 5 |
| `AI_API_KEY` | secret | Analisis AI (QD-30); wrapper meneruskan lewat `secrets: inherit` | aktif |
| `AI_BASE_URL`, `AI_MODEL` | variable | endpoint OpenAI-compatible + model, mis. `https://openrouter.ai/api/v1` | aktif |

`GITHUB_TOKEN` cukup untuk komentar PR (`pull-requests: write`) dan, nanti, issue otomatis (`issues: write`).

## Memasang required check
1. Jalankan workflow PR sekali (buka PR apa saja ke `develop`) supaya nama check terdaftar.
2. GitHub → **Settings → Branches** (atau **Rules → Rulesets**) → rule untuk `develop`, lalu ulangi
   untuk `staging` dan `main`.
3. Centang **Require status checks to pass**, cari dan tambahkan **`qa-audit / audit`**.
4. Simpan. Mulai saat itu PR dengan verdict `fail` atau `infra-error` tidak bisa di-merge.

Via CLI (butuh admin; contoh untuk `develop`, sesuaikan dengan proteksi yang sudah ada):
```bash
gh api -X PATCH repos/ibrahimpalamarta/SPPG-Dashboard/branches/develop/protection/required_status_checks \
  -f strict=true -f 'contexts[]=qa-audit / audit'
```

## Target waktu
Workflow PR < 10 menit. Catat durasi 5 run berturut di [roadmap.md](roadmap.md) sebelum DoD dicentang.
