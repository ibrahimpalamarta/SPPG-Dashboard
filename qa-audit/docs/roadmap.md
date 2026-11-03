# Roadmap dan open items

## Fase
| Fase | Tanggal | Isi | Status |
|---|---|---|---|
| 1 Fondasi | 26 Okt – 1 Nov | Scaffold, guard, code audit, gate + merge-report, environment sementara, smoke RBAC, workflow PR, docs, AGENTS.md | selesai; workflow PR sudah jalan di CI (durasi di bawah) |
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
| O-05 | Selesai: root `CLAUDE.md` tidak lagi menyebut Auth0 | – | – |
| O-06 | Kontrak `data-testid` belum disepakati | front-end | [data-testid.md](data-testid.md) |
| O-07 | Selesai untuk CI: `qa-setup` Node 24 (QD-29). Sisa: `engines`, `@types/node`, Vitest 5 | QA | – |
| O-08 | Role PRD (Management, Finance, Kepala Kitchen, Data Steward) belum ada di enum kode (B-ROLE) | product + backend | Peta sementara QD-03 |
| O-09 | Selesai: workflow PR berjalan di CI untuk PR #160–#163; 5 durasi tercatat di bawah | – | – |
| O-10 | Ambang Lighthouse/visual dikalibrasi setelah 2 minggu nightly | QA | fase 3 |
| O-11 | OD-02, OD-03, OD-04 open | Finance / COO / Nutrition | test fixme |
| O-17 | Kontras warna: teks `text-slate-400 text-xs` (6–13 elemen per halaman) melanggar axe `color-contrast` (serious) di semua halaman terautentikasi. 10 test `@a11y` gagal sebagai Warning (QD-45). Setelah diperbaiki: tambahkan `@smoke` ke `a11y.spec.ts` supaya Blocker | front-end | Ditemukan 2 Nov |
| O-18 | `requirements.json` masih mengutip PRD v0.1 (role Management/Finance, ERR-xx). Perlu disinkronkan ke PRD v4 oleh pemilik produk. mulai 15 Nov 9 requirement menjadi Blocker (`no-test-past-target`: AC-HEALTH-01, AC-TRACE-01, P1-031, ERR-01..05; `pending-past-target`: AC-DASH-02 sampai O-12 beres), 21 Nov ERR-07, 30 Nov P1-033, 4 Des AC-DASH-04/05 dan ERR-06, kecuali target digeser atau test ditulis | product + QA | P1-034 (P1) tidak memblok |
| O-19 | `backend/src/routes/auth/auth.ts` mendaftarkan `POST /forgot-password` dua kali (baris identik) | backend | Handler kedua tidak pernah jalan |
| O-20 | Belum ada E2E untuk MFA TOTP, lockout login, dan rate-limit; `MFA_REQUIRED_ROLES` kosong di environment QA (QD-10) | QA | Butuh pembangkit TOTP di test |

## Durasi workflow PR
| Run | Tanggal | Durasi | Catatan |
|---|---|---|---|
| 1 | 2 Nov | 4 mnt 22 dtk | feature/kelengkapan-kitchen-detail |
| 2 | 2 Nov | 3 mnt 28 dtk | feature/kelengkapan-kitchen-detail |
| 3 | 2 Nov | 2 mnt 47 dtk | fix/upload-delete-s3-permission |
| 4 | 2 Nov | 2 mnt 35 dtk | feature/kelengkapan-kitchen-detail |
| 5 | 2 Nov | 3 mnt 38 dtk | develop |

## Temuan dari E2E review-publish (aplikasi, jangan diubah dari qa-audit)
| Id | Temuan | Pemilik |
|---|---|---|
| O-12 | Baris `PENGGAJIAN` (mis. "No Rekening Relawan", Rp26,8 jt) masuk Top 5 Supplier dan Komposisi Pengeluaran di Finance dan Overview. Dokumen pengujian D: gaji/petty cash/transfer internal bukan belanja supplier (AC-DASH-02). Test `fixme` di `review-publish.spec.ts` menunggu keputusan atau perbaikan. | backend + product |
| O-13 | Tab Riwayat tidak punya label untuk `upload_batch.submitted`, `.returned`, `.published` (tampil string mentah). | frontend |
| O-14 | UI Unggah hanya mengirim `replaces` saat mengulang batch NEEDS_MAPPING_UPDATE, jadi koreksi batch Published (SCRUM-96) tidak bisa dipicu dari UI. Test menyisipkan field itu ke form. | frontend |
| O-15 | Detail batch berstatus Diganti tidak menampilkan "Dikoreksi oleh batch …" (hanya ada di `errorSummary`). | frontend |
| O-16 | Log pengajuan pemerintah (SCRUM-59/107) belum punya UI; hanya API, token sesi di sisi server, jadi belum ada E2E. | frontend (T26) |
