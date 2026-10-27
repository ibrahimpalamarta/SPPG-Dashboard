# Konfigurasi

## Environment variable
Dibaca dari environment, atau `qa-audit/.env` (lihat [`.env.example`](../.env.example)). Environment asli menang.

| Variabel | Default | Fungsi |
|---|---|---|
| `QA_SUITE` | `smoke` | Suite Playwright: `smoke`, `full`, `uat` |
| `QA_DATABASE_URL` | – | Pakai Postgres sendiri (host wajib lolos guard). Kosong = embedded |
| `QA_SEED_PASSWORD` | acak per run | Password semua akun QA |
| `QA_BASE_URL` | `http://localhost:13000/admin/` | Target Playwright (wajib lolos guard) |
| `QA_STAGING_URL` | – | Satu-satunya host non-localhost yang diizinkan guard |
| `QA_SKIP_BUILD` | – | `1` = pakai hasil build backend/admin yang ada |
| `QA_ENV_TIMEOUT_MS` | `900000` | Batas tunggu tahap 3 |
| `QA_GIT_RANGE` | `origin/develop..HEAD` | Rentang commit gitleaks |
| `QA_SECURITY_FULL` | `0` | `1` = gitleaks seluruh riwayat + Semgrep `p/default` (mingguan) |
| `RUN_VISUAL` | – | `1` = jalankan `@visual` di laptop (baseline tetap dari CI) |
| `ENFORCE` | `1` | `0` = laporan saja, exit 0 |
| `QA_TRIGGER`, `QA_STARTED_AT`, `OUTCOME_*` | – | Diisi CI / `audit.ts` |
| `AI_API_KEY` | – | Kunci Analisis AI (`npm run ai-review`, QD-30). Kosong = dilewati |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` | Endpoint OpenAI-compatible |
| `AI_MODEL` | – | Model, wajib bila `AI_API_KEY` diisi |

Port tetap: Postgres 15432, backend 18080, frontend-admin 13000, S3 tiruan 19000 (`scripts/lib.ts`), sengaja beda
dari port dev (5432/8080/3000) supaya bisa jalan berdampingan dengan dev server.

## Tag
Ditulis di judul test (`@smoke`), dibaca Playwright sebagai tag.

| Tag | Arti | Suite |
|---|---|---|
| `smoke` | Jalur kritis, cepat | PR, full |
| `rbac` | Role & kitchen scope | PR, full |
| `pii` | Tidak ada PII bocor | PR, full |
| `kpi` | Rumus/tampilan KPI | full |
| `a11y` | axe per halaman | PR, full |
| `visual` | Screenshot; hanya CI (lokal jika `RUN_VISUAL=1`) | full |
| `responsive` | Viewport lain | full |
| `demo` | Langkah demo P1-031, menghasilkan evidence | uat |
| `uat` | UAT P1-033 | uat |
| `lawang` | Reusability Lawang P1-034 | full |
| `quarantine` | Flaky, dilewati di PR, tetap jalan nightly | full |

Suite → filter ada di `playwright.config.ts` (`SUITES`). Gagal di tag `smoke`/`rbac`/`pii` = Blocker
(`gate.json` → `playwrightBlockerTags`).

## Role (akun seed QA)
Dibuat `scripts/seed-qa.ts`, email `qa.<key>@qa-audit.test`. Peta role PRD → role kode (QD-03, PRD Oktober §3):

| Key / storageState | Role PRD | Role kode | Kitchen scope |
|---|---|---|---|
| `management` | Management (COO/Head of MBG) | `MANAGEMENT` | semua |
| `finance` | Finance | `FINANCE` | semua |
| `kepala-kitchen-skn` | Kepala Kitchen Sukun | `KEPALA_KITCHEN` | SKN |
| `data-steward` | Data Steward pusat | `DATA_STEWARD` | semua |

Login dilakukan sekali per role oleh project `setup` (`tests/e2e/auth.setup.ts`), disimpan ke
`.auth/<key>.json`; test memakai `test.use({ storageState: storageState('finance') })`.
Akun QA tanpa MFA (`MFA_REQUIRED_ROLES` kosong di environment QA, QD-10).

## Fixture (fase 2)
Dibuat script dari kode, tidak pernah dari file nyata dapur (D-08). Daftar yang akan dibuat:
cashflow Sukun bersih, teks mata uang (`Rp65,000`), transaksi multi-baris dengan total berulang,
kolom wajib kosong, periode kosong, schema tak dikenal, submission ganda, transfer internal,
cashflow Lawang, RAB Sukun.

## Aturan screenshot
- Viewport 1440×900, tema terang, `reducedMotion: reduce`, locale `id-ID`, zona `Asia/Jakarta`.
- Area dinamis (timestamp, durasi) di-mask lewat `mask: [...]` pada `toHaveScreenshot`.
- Hanya data seed boleh muncul.
- Baseline hanya dibuat oleh workflow manual `baseline` di CI, lalu di-commit dari artifact-nya.
