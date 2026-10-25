# qa-audit — SPPG Dashboard

Audit kode, fitur, dan UI/UX untuk SPPG Dashboard yang menghasilkan **satu verdict**
(aman di-merge atau tidak) plus scorecard dan bukti per requirement PRD. Jalan di CI atau laptop;
tidak ada server permanen, tidak pernah menyentuh production.

```bash
npm ci && npx playwright install chromium   # sekali (backend/ dan frontend-admin/ juga npm ci)
npm run audit                               # enam tahap, hasil di reports/scorecard.html
```

| Tahap | Isi |
|---|---|
| 1 Code audit | tsc (backend, frontend-admin), ESLint + jsx-a11y, Semgrep, gitleaks. Blocker → tahap 2–5 dilewati |
| 2 Logic test | Vitest: aturan DQ, adapter, rumus KPI |
| 3 Environment | Postgres embedded, migrate, seed akun per role, build, start |
| 4 Feature E2E | Playwright: RBAC, PII, alur upload → dashboard, axe |
| 5 UI/UX | Visual, Lighthouse (fase 3) |
| 6 Laporan & gate | `merge-report` → verdict, scorecard, komentar PR (selalu jalan) |

## Dokumentasi
| | |
|---|---|
| [Tujuan, ruang lingkup, asumsi, prinsip](docs/tujuan.md) | [Arsitektur dan flow](docs/arsitektur.md) |
| [Panduan pakai (setup, harian, UI Mode, codegen, trace)](docs/panduan.md) | [Konfigurasi (env, tag, role, fixture, screenshot)](docs/konfigurasi.md) |
| [Workflow CI, secret, required check](docs/ci.md) | [Gate, severity, waiver, flaky](docs/gate.md) |
| [Kontrak file mentah dan output](docs/kontrak-output.md) | [Pemetaan requirement PRD & Jira](docs/requirements.md) |
| [Menambah test, fixture, halaman, tool](docs/menambah.md) | [Troubleshooting](docs/troubleshooting.md) |
| [Roadmap dan open items](docs/roadmap.md) | [Decision log](docs/decision-log.md) |
| [Usulan kontrak data-testid](docs/data-testid.md) | [AGENTS.md](AGENTS.md) (panduan agen AI) |
