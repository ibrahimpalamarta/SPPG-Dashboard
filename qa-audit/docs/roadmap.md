# Roadmap dan open items

## Fase
| Fase | Tanggal | Isi | Status |
|---|---|---|---|
| 1 Fondasi | 26 Okt – 1 Nov | Scaffold, guard, code audit, gate + merge-report, environment sementara, smoke RBAC, workflow PR, docs, AGENTS.md | selesai di branch `feature/qa-audit`, menunggu verifikasi CI |
| 2 Menuju demo | 2 – 14 Nov (gate demo W2 Nov, P1-031) | Fixture xlsx, logic test DQ/KPI, E2E alur Sukun (fixme bila fitur belum ada), RBAC + PII, axe `@a11y`, evidence P1-031, `qa-manual.yml` | – |
| 3 Pilot | 15 – 30 Nov (pilot exit) | Visual regression + workflow baseline, Lighthouse nightly (3 run, login Finance via `puppeteerScript`), `qa-nightly.yml` + issue otomatis, riwayat flaky, evidence UAT P1-033, `@lawang` P1-034 | – |
| 4 Menuju live | 1 – 4 Des (Phase 1 live) | k6, `qa-weekly.yml` (Semgrep penuh, gitleaks riwayat, Trivy fs/secret/Terraform, ZAP baseline ke staging), tren nightly 14 hari | – |
| 5 Setelah live | – | Target staging, Hurl, Jira otomatis, repo terpisah, publikasi S3 | – |

## Open items
| # | Item | Pemilik | Catatan |
|---|---|---|---|
| O-01 | `backend/scripts/grant-public-role.ts` crash: query laporan grants memilih `information_schema.table_name` (tipe `sql_identifier`) yang tidak bisa dideserialisasi Prisma (P2010), **setelah** `ALTER ROLE` sukses. Perbaikan: `table_name::text`. Sementara seed-qa menjalankan `ALTER ROLE` sendiri | backend | Ditemukan qa-audit 25 Okt |
| O-02 | `jsx-a11y` aktif tapi hanya 6 rule bawaan `eslint-config-next`. Usulan: tambah `jsx-a11y` `recommended` di `frontend-admin/eslint.config.mjs` | front-end | qa-audit tidak mengubah config app |
| O-03 | Backend dan frontend-public tidak punya ESLint | backend / front-end | Hanya tsc + Semgrep untuk backend |
| O-04 | Upload E2E butuh S3. Environment QA memakai bucket palsu; perlu S3 lokal (mis. emulator) atau mode storage lokal di backend | backend + QA | Menentukan cakupan AC-UP-01 di fase 2 |
| O-05 | Root `README.md`/`CLAUDE.md` masih menyebut Auth0 dan frontend "Segera Hadir" | maintainer | Di luar scope qa-audit |
| O-06 | Kontrak `data-testid` belum disepakati | front-end | [data-testid.md](data-testid.md) |
| O-07 | Node CI 22; ikut naik ke 24 bersama `chore/upgrade-node` | maintainer | ubah `qa-setup` |
| O-08 | Role PRD (Management, Finance, Kepala Kitchen, Data Steward) belum ada di enum kode (B-ROLE) | product + backend | Peta sementara QD-03 |
| O-09 | Durasi workflow PR 5 run berturut belum dicatat | QA | DoD |
| O-10 | Ambang Lighthouse/visual dikalibrasi setelah 2 minggu nightly | QA | fase 3 |
| O-11 | OD-02, OD-03, OD-04 open | Finance / COO / Nutrition | test fixme |

## Durasi workflow PR
| Run | Tanggal | Durasi | Catatan |
|---|---|---|---|
| – | – | – | diisi setelah PR pertama |
