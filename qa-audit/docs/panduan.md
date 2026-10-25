# Panduan pakai

## Setup sekali
```bash
cd backend && npm ci && cd ../frontend-admin && npm ci && cd ../qa-audit
npm ci
npx playwright install chromium
cp .env.example .env   # opsional, semua nilai punya default
```
Butuh Node ≥ 20.11 (CI memakai 22). Docker dan Postgres **tidak** dibutuhkan: tahap 3 memakai
`embedded-postgres` 16.14. Semgrep dan gitleaks opsional di laptop (kalau tidak terpasang,
tercatat sebagai Info).

## Perintah harian
| Perintah | Isi |
|---|---|
| `npm run audit` | Semua tahap, suite smoke. Hasil: `reports/scorecard.html` |
| `npm run audit -- --suite=full` | Semua test kecuali `@visual` (lokal) |
| `npm run stage:code` lalu `npm run report -- --stage=code` | Hanya code audit + gate fail-fast |
| `npm run stage:logic` | Vitest |
| `npm run stage:env` / `npm run env:down` | Nyalakan / matikan environment sementara |
| `npm run stage:e2e` | Playwright (environment harus sudah `up`) |
| `npm run report` | Gabungkan raw → verdict, scorecard, komentar PR |
| `npm run typecheck` | tsc untuk qa-audit sendiri |

Iterasi cepat pada test E2E:
```bash
npm run stage:env            # sekali, ±30-90 dtk
npx playwright test tests/e2e/rbac.spec.ts
QA_SKIP_BUILD=1 npm run stage:env   # restart tanpa build ulang
npm run env:down
```

## UI Mode, codegen, trace
- **UI Mode**: `npx playwright test --ui` (environment harus `up`). Pilih test, lihat tiap langkah.
- **Codegen**: `npx playwright codegen http://localhost:13000/admin/login`. Ambil selector berbasis
  role/label; jangan menyalin selector CSS yang dihasilkan.
- **Trace**: di CI trace direkam pada retry pertama. Unduh artifact `qa-audit-*`, lalu
  `npx playwright show-trace reports/playwright-results/<test>/trace.zip`. Lokal: tambah `--trace on`.
- **Laporan HTML Playwright**: `npx playwright show-report reports/playwright-report`.

## Membaca hasil
- `reports/scorecard.html`: verdict, status per tahap, temuan urut Blocker, bukti requirement.
- `reports/verdict.json`: versi mesin (kontrak di [kontrak-output.md](kontrak-output.md)).
- `reports/env.log`: output migrate/seed/build/server dari tahap 3.
