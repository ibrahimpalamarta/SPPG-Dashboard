# AGENTS.md — qa-audit

Panduan untuk agen AI yang bekerja di `qa-audit/`. Baca juga [README.md](README.md) dan
[docs/decision-log.md](docs/decision-log.md) sebelum mengubah perilaku.

## Konteks repo (root belum punya AGENTS.md)
- Monorepo tanpa workspace: `backend/` (Express + Prisma + auth internal), `frontend-admin/`
  (Next 16, basePath `/admin`), `frontend-public/`, `infra/` (Terraform), `projects/jira/`
  (status tiket SCRUM dan decision log aplikasi D-xx). Tiap folder punya lockfile sendiri.
- Alur branch: `feature/*`/`fix/*` → PR ke `develop` → `staging` → `main`. Jangan push ke
  `develop`, `staging`, atau `main`. Commit kecil, present tense.
- Requirement: PRD SPPG Internal Dashboard v0.1 (Drive `1kBwyixbJadujNz0pT1dfJCZ6LIMwJXgbdw5TW0KJqpc`).

## Tujuan service
Satu verdict per run (aman di-merge atau tidak) plus bukti: code audit, logic test, E2E, UI/UX,
lalu scorecard. Bukan server; hanya jalan di CI atau laptop.

## Struktur
```
gate.json            aturan gate (hanya dibaca merge-report)
requirements.json    requirement PRD/Jira yang dibuktikan
scripts/             audit, code-audit, env, seed-qa, guard, merge-report, lib
tests/logic/         Vitest (fungsi murni backend + gate qa-audit sendiri)
tests/e2e/           Playwright (auth.setup.ts, roles.ts, *.spec.ts)
semgrep/             rule Semgrep kustom
docs/                dokumentasi (bahasa Indonesia)
reports/ .auth/ .pg/ hasil run, sesi login, data Postgres — gitignored
```

## Perintah
| | |
|---|---|
| Install | `npm ci` lalu `npx playwright install chromium` (backend & frontend-admin juga `npm ci`) |
| Audit penuh | `npm run audit` (`-- --suite=full`) |
| Type check qa-audit | `npm run typecheck` |
| Logic test | `npm run stage:logic` |
| E2E | `npm run stage:env` → `npx playwright test [file]` → `npm run env:down` |
| Laporan | `npm run report` |

## Konvensi
- Judul test: `[ID] deskripsi @tag`; ID dari PRD (AC-*, P1-0xx, OD-xx, ERR-xx) atau Jira (SCRUM-xx).
  Hanya ID yang benar-benar dibuktikan test itu.
- Tag: smoke, rbac, pii, kpi, a11y, visual, responsive, demo, uat, lawang, quarantine
  (arti di [docs/konfigurasi.md](docs/konfigurasi.md)).
- Role lewat storageState: `management`, `finance`, `kepala-kitchen-skn`, `data-steward`.
- Selector: role/label dulu; `data-testid` hanya yang ada di [docs/data-testid.md](docs/data-testid.md).
- Navigasi relatif (`page.goto('finance')`) karena basePath `/admin`.
- Bahasa severity: Blocker, Warning, Info.

## Aturan wajib
1. **Jangan pernah menjalankan apa pun ke production.** Semua URL lewat `scripts/guard.ts`;
   jangan melemahkan atau melewati guard.
2. **Jangan commit secret.** Password seed dan kunci dibuat acak per run; `.auth/` dan `.env` gitignored.
3. **Jangan melemahkan gate atau menambah waiver tanpa catatan alasan** di
   `docs/decision-log.md`. Waiver wajib `reason`, `owner`, `expires`; secret tidak bisa di-waive.
4. **Jangan mengubah kode aplikasi** (`backend/`, `frontend-*`, `infra/`). Satu-satunya usulan ke
   aplikasi adalah kontrak `data-testid` di docs. Bug aplikasi yang ditemukan → open item di
   `docs/roadmap.md`.
5. **Perubahan perilaku wajib memperbarui docs dan decision log di commit yang sama.**
6. **Baseline screenshot hanya dari CI** (workflow manual `baseline`), tidak pernah dari laptop.
7. **Test untuk OD yang belum diputuskan tetap `fixme`** dengan ID OD di judul. Jangan menebak rumus.
8. Hanya Chromium, satu toolchain TypeScript lewat npm, versi dependency/tool di-pin.

## Menambah test dan requirement
Lihat [docs/menambah.md](docs/menambah.md) dan [docs/requirements.md](docs/requirements.md).
Singkatnya: entri di `requirements.json` → test dengan ID di judul (atau `fixme` bila fitur
belum ada) → `npm run report` → cek scorecard.

## Definition of Done (per perubahan)
- `npm run typecheck` dan `npm run stage:logic` lulus.
- Perubahan pada E2E/environment: `npm run audit` lokal menghasilkan verdict yang diharapkan.
- Perubahan gate: kasus baru di `tests/logic/gate.test.ts`.
- Docs + decision log diperbarui; tidak ada `console.log` debug, import, atau kode mati.

## Kapan harus bertanya
- Requirement ambigu, atau perilaku aplikasi berbeda dari PRD (jangan menyesuaikan test diam-diam).
- Butuh mengubah kode aplikasi, `gate.json`, ambang, atau menambah waiver.
- Butuh secret, akses staging, atau target environment baru.
- Keputusan OD, peta role, kontrak `data-testid`, pemilik hasil nightly.
