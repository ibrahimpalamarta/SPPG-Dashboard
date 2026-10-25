# Decision log

Format: ID · tanggal · keputusan · alasan · penyimpangan dari prompt tugas (bila ada).
Keputusan proyek aplikasi (D-xx) ada di `projects/jira/decisions.md`; yang ini khusus qa-audit (QD-xx).

## Dijawab user (25 Okt 2026)

**QD-01 · Base branch.** `feature/qa-audit` ditumpuk di `feature/internal-auth` (PR #27), pola D-02. PR dibuka setelah #27 merge. Alasan: login internal + MFA hanya ada di #27; develop masih Auth0.

**QD-02 · Fitur yang belum dibangun.** Test P0 ditulis sesuai PRD sebagai `test.fixme` → status *Menunggu fitur* (tidak memblok). Lewat `target` di `requirements.json` → Blocker (`pendingFeaturePastTarget`); P0 tanpa test lewat target juga Blocker (`noTestPastTarget`). *Penyimpangan*: prompt hanya punya empat status; ditambah *Menunggu fitur* dan *Tidak dijalankan* (test ada tapi di luar suite run ini).

**QD-03 · Peta role.** Management & Finance = `INTERNAL` semua kitchen; Kepala Kitchen SKN = `INTERNAL` + scope SKN; Data Steward = `DATA_ADMIN` dengan scope semua kitchen (DATA_ADMIN tanpa baris scope tidak melihat apa pun). Satu tempat: `scripts/seed-qa.ts`. Diganti saat enum role PRD masuk (B-ROLE).

**QD-04 · Trigger PR.** PR ke `develop`, `staging`, `main`; required check di ketiganya. *Penyimpangan*: prompt menyebut "PR ke main"; alur repo memasukkan fitur ke `develop`.

**QD-05 · Penyimpanan.** Artifact GitHub (30 hari, mingguan 90).

**QD-06 · Pemilik.** ItsMauls: hasil nightly/weekly (assignee issue otomatis), seed dan akun QA, owner default waiver baru.

**QD-07 · Jira.** Sinkronisasi ditunda ke fase 5; `requirements.json` diisi manual dari PRD + `projects/jira/`.

**QD-08 · OD-02/03/04.** Masih open → test fixme, *Menunggu keputusan*.

## Keputusan implementasi

**QD-09 · Postgres = embedded-postgres 16.14.0-beta.17**, di laptop dan CI. Alasan: versi sama dengan RDS (16.14), laptop tanpa Docker/Postgres tetap bisa `npm run audit`, dan satu jalur kode untuk laptop dan CI (tanpa service container). `QA_DATABASE_URL` tetap tersedia.

**QD-10 · Akun QA tanpa MFA.** `MFA_REQUIRED_ROLES` kosong di environment QA. Login setup Playwright dan (nanti) Lighthouse cukup email + password. *Penyimpangan* dari rencana awal (TOTP di setup). Alur MFA sendiri akan diuji dengan akun khusus ber-MFA di fase 2.

**QD-11 · Password seed acak per run.** `QA_SEED_PASSWORD` opsional. Alasan: environment hidup satu run saja, jadi tidak ada secret yang perlu disimpan/dirotasi. *Penyimpangan*: prompt menyebut secret password seed; baru dibutuhkan saat target staging (fase 5).

**QD-12 · Backend QA berjalan `NODE_ENV=production`** dengan role DB terbatas `sppg_public`, sama seperti production. Kunci MFA dan password `sppg_public` acak per run. Karena `grant-public-role.ts` crash (open item O-01), `ALTER ROLE` dijalankan oleh `seed-qa.ts` dengan pernyataan yang sama; kembali ke script backend setelah diperbaiki.

**QD-13 · Vitest 4.1.12**, terbit 15 Okt (< 2 minggu). Alasan: 4.1.11 terkena GHSA-qxg6-89mg-rqv8 dan GHSA-xp26-3454-mjgp; perbaikan keamanan didahulukan atas aturan umur versi. Vitest 5 butuh Node ≥ 22.12, sedangkan repo masih `>=20.11`.

**QD-14 · `next start`, bukan server standalone.** Next memperingatkan bahwa `next start` tidak dipakai bersama `output: standalone`, tetapi tetap melayani dengan benar. Production memakai `server.js` standalone; selisihnya hanya cara serve. Ditinjau ulang bila muncul perbedaan perilaku.

**QD-15 · ESLint error = Warning, warning = Info.** Prompt hanya menyebut "saran lint = Info" dan tidak memasukkan lint ke daftar Blocker; `ci.yml` saat ini tidak menjalankan lint sama sekali.

**QD-16 · Playwright.** Gagal di tag smoke/rbac/pii = Blocker; gagal di tag lain = Warning; login setup gagal = Blocker (tanpa itu semua test di belakangnya *did not run* dan verdict akan hijau palsu).

**QD-17 · ID ERR-01..08** diberikan qa-audit untuk delapan skenario PRD §9 (urutan tabel PRD).

**QD-18 · Tool hilang.** Di laptop = Info. Di CI (`CI` di-set) tool tidak ada atau crash = Blocker `infra` → verdict `infra-error`, karena pipeline-nya yang rusak, bukan produk.

**QD-19 · axe di tahap 4** sebagai test Playwright `@a11y` (memakai login dan halaman yang sama); tahap 5 berisi visual dan Lighthouse.

**QD-20 · Publikasi S3 ditunda.** Langkah S3 butuh izin OIDC `id-token: write`; tidak ditambahkan sebelum bucket dan role-nya ada.

**QD-21 · Tidak ada `AGENTS.md` di root.** Sesuai prompt: root belum punya, jadi petunjuk singkat repo ditaruh di `qa-audit/AGENTS.md`, dan `qa-audit/CLAUDE.md` mengimpornya. *Penyimpangan* dari rencana awal (yang sempat mengusulkan AGENTS.md root).

**QD-22 · Node 22 di CI**, sama dengan `ci.yml`. Naik ke 24 bersama `chore/upgrade-node` (O-07).

**QD-23 · frontend-public tidak diaudit** (masih satu halaman statis; sudah dibangun oleh `ci.yml`). Ditambahkan saat halaman produk mulai dibangun.

**QD-24 · Semgrep.** PR: `p/typescript` + rule kustom `semgrep/sppg.yml`. Mingguan: tambah `p/default`. Rule kustom: log body request (ERROR), `$queryRawUnsafe`/`$executeRawUnsafe` (WARNING).

**QD-25 · Quarantine** dideteksi otomatis (fase 3), ditandai manual lewat PR. Alasan: mengubah file test dari pipeline membuat run tidak reproducible.

**QD-26 · Tahap `--stage=code`** memakai fungsi gate yang sama dengan laporan akhir, supaya keputusan fail-fast dan verdict tidak pernah berbeda aturan.

**QD-27 · Backend dibangun dengan `tsc -p`, bukan `npm run build`.** `prebuild` menjalankan ulang `prisma generate`, yang sudah dijalankan tahap 1 dan yang gagal di Windows saat dev server memegang engine. Bila generator gagal di tahap 1, itu Warning `generate-failed` dan tsc tetap jalan.

**QD-28 · Eksekusi lokal pertama (25 Okt).** `npm run audit` di Windows, Node 22, dev server user tetap jalan: verdict `pass`, 80 dtk. Probe error tipe sementara di `backend/src`: tahap 2–5 `skipped`, scorecard tetap dibuat, exit 1 (probe dihapus).

**QD-29 · Satu check PR.** Job `ci.yml` (backend build + test, build frontend-public, terraform fmt/validate) pindah ke step `0. CI build` di `qa-audit.yml`, supaya PR hanya punya satu check `qa-audit / audit`. Gagal → Blocker `ci-failed` (tool `ci`, verdict `fail`, bukan `infra-error`: build/test merah adalah kegagalan produk) lewat `stageFailedWithoutReport`, tanpa aturan gate baru. `ci.yml` tetap untuk push ke `develop`. `qa-setup` naik ke Node 24 agar sama dengan deploy dan Dockerfile (menggantikan QD-22). Lokal `npm run audit` tidak menjalankan tahap ini.

**QD-30 · Analisis AI hanya saran.** Step `AI review` (setelah "6. Report & gate") mengirim temuan Blocker/Warning dari `verdict.json` plus diff PR (maks 60 KB) ke model OpenAI-compatible (`AI_BASE_URL`, `AI_MODEL`; awal: OpenRouter `nvidia/nemotron-3-ultra-550b-a55b:free`), lalu menambahkan bagian "Analisis AI" (penyebab + saran perbaikan) ke komentar PR dan scorecard. Verdict tetap hanya dari `gate.json`: output LLM tidak deterministik, jadi tidak boleh memblok merge; error/timeout API tidak memengaruhi check. Pesan gitleaks dan diff file yang ditandai gitleaks tidak pernah dikirim (bisa berisi secret). *Risiko diterima:* model gratis OpenRouter dapat mencatat prompt, artinya potongan kode PR keluar dari CI; ganti ke model berbayar tanpa logging bila itu tidak bisa diterima. Tanpa `AI_API_KEY` (lokal, PR dari fork) step dilewati. Loop verifikasi = push perbaikan → semua tool jalan ulang → komentar diperbarui.

**QD-31 · Temuan keamanan Semgrep memblok merge.** Sebelumnya hanya level `ERROR` yang jadi Blocker, jadi rule keamanan ber-level `WARNING` (mis. `sppg-raw-sql-unsafe`) lolos hijau. Sekarang rule ber-tag `security` (registry Semgrep) jadi minimal `gate.json` → `semgrep.security` (`Blocker`), apa pun levelnya; ditentukan dari tag rule di SARIF, bukan dari penilaian AI (tidak deterministik, dan bisa salah menilai). Level rule `sppg-raw-sql-unsafe` dinaikkan ke `ERROR` dengan metadata CWE-89. Level default rule dibaca dari `defaultConfiguration` SARIF karena Semgrep tidak mengisi level per hasil. Path absolut runner CI diubah jadi relatif repo supaya waiver `match` bisa cocok. *Waiver:* `sppg-raw-sql-unsafe` di `backend/scripts/grant-public-role.ts` (DDL `ALTER ROLE` tidak bisa di-bind; SQL dibangun `format()` `%I/%L` dari parameter ter-bind), owner ItsMauls, s/d 2027-04-30. `gcm-no-tag-length` di `backend/src/lib/crypto.ts` tidak di-waive: diperbaiki di branch `fix/gcm-auth-tag-length`, dan PR ini merah sampai fix itu ada di `develop`.
