# Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `EPERM ... query_engine-windows.dll.node` | Dev server backend memegang engine Prisma (Windows) | Tercatat Warning `generate-failed`; tsc tetap jalan. Hentikan dev server bila schema berubah |
| `EPERM ... lightningcss...node` saat `npm ci` frontend-admin | `next dev` sedang jalan | Pakai `npm install` atau hentikan dev server dulu |
| `environment not ready` | Lihat tail `reports/env.log` yang dicetak | Biasanya migrate/seed/build gagal; di CI tercatat `infra-error` |
| Port 15432/18080/13000 dipakai | Run sebelumnya tidak dimatikan | `npm run env:down` |
| `qa-audit guard: host ... bukan target yang diizinkan` | `QA_BASE_URL`/`QA_DATABASE_URL` mengarah ke host lain | Disengaja. Hanya localhost atau `QA_STAGING_URL` |
| Semua test E2E *did not run* | Login setup gagal | Blocker. Buka screenshot `reports/playwright-results/auth.setup*` |
| `no seeded account for <role>` | `.auth/accounts.json` belum ada | Jalankan `npm run stage:env` dulu |
| Navigasi ke `/finance` 404 | Path absolut memotong basePath | Pakai `page.goto('finance')` |
| `semgrep-skipped`/`gitleaks-skipped` Info | Tool tidak terpasang di laptop | Opsional. Di CI hal yang sama = `infra-error` |
| `npm install` qa-audit: `Cannot read properties of null (reading 'edgesOut')` | Bug npm 10.9 dengan peer optional | `npx npm@11 install` untuk mengubah dependency; `npm ci` biasa tetap jalan |
| Postgres embedded gagal start di Linux sebagai root | `initdb` menolak root | Jalankan sebagai user biasa (runner GitHub sudah begitu) |
