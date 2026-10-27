# Blockers

Setiap tiket `BLOCKED` (seluruhnya atau sebagian) di STATUS.md punya entri di sini.

## Aktif

| ID | Tiket terdampak | Jenis | Deskripsi | Yang dibutuhkan & dari siapa | Status | Tanggal |
|---|---|---|---|---|---|---|
| B-ROLE | SCRUM-20, 121 | keputusan | Tiket menyebut "2 role". Implementasi mengasumsikan PM MBG = `SUPER_ADMIN` dan Data Admin/PIC Kitchen = `DATA_ADMIN`. Pemetaan ke 6 role PRD §3 belum ditetapkan. | Konfirmasi dua role + pemetaan ke 6 role PRD — Product/PM MBG | OPEN | 2026-10-23 |
| B-PLAN | SCRUM-123 | keputusan | "Data Rencana disembunyikan" berpotensi bertentangan dengan PRD AC-DASH-01 (Planned Cost wajib tampil berlabel "Rencana/RAB-based"). Belum jelas role mana dan data apa. | Role & data yang disembunyikan — Product/Finance | OPEN | 2026-10-23 |
| B-DOCS | Semua | dokumen | Tidak ditemukan di repo maupun Drive: **SPPG_Data_Reference_and_Data_Dictionary_v0.2_Synced_to_BRD_v2.xlsx** dan **SPPG_Phase1_Clickable_Prototype_v0.2_Synced_to_BRD_v2.html**. Yang tersedia: PRD v0.1 (8 Okt 2026), BRD v2. | Berkas Data Dictionary v0.2 dan Prototype v0.2 — Product (Zahra/Putri) | OPEN | 2026-10-23 |
| B-DD | SCRUM-26, 27–32, 55–58 | dokumen | (Sebagian tertutup untuk Cashflow: `Kamus_Data` di template Sukun, lihat SCRUM-35.) Tanpa Data Dictionary v0.2, nama field kanonik per dataset (selain field traceability PRD §7.2 dan nama dataset §7.1) belum bisa dipastikan. Profil mapping yang menyentuh field kanonik disimpan sebagai `DRAFT` dengan `TODO(B-DD)`. | Sama dengan B-DOCS | OPEN | 2026-10-23 |
| B-SAMPLE-LWG | SCRUM-36, 56, 32, 58 | sampel | Tidak ada sampel Lawang (Cashflow/Aksis Pengeluaran, Menu). | Export Aksis › Pengeluaran + Menu Lawang — Accountant/Ahli Gizi Lawang | OPEN | 2026-10-23 |
| B-SAMPLE-OTHER | SCRUM-57, 58 | sampel | Dokumentasi report DNM/PCK/SML belum masuk dictionary (BRD G16). SML butuh report minimum (log pengeluaran + foto nota, saldo harian, form operasional harian). | Sampel/dokumentasi DNM, PCK, SML — Analis data | OPEN | 2026-10-23 |
| B-TPLVER | SCRUM-35, 36, 130, 39 | dokumen | Template Cashflow Sukun tidak punya sel/penanda `template_version`. PRD §7.2 mewajibkan field ini. | Format & lokasi penanda versi di template resmi (diusulkan di SCRUM-130) — Data Steward | OPEN | 2026-10-23 |
| B-SCHEMA | SCRUM-20, 22/37, 132, 24, 35, 36, 118, 38, 121 | skema | Persetujuan skema [USULAN]. Sudah termigrasi di branch lokal (belum di-push): `user_kitchen_scopes`, `kitchens.code` (SCRUM-20); kolom `upload_batches` di luar [PRD] (SCRUM-22). Staging (`staging_rows`) + `SUPERSEDED` termigrasi 2026-10-26. Belum termigrasi: `kitchens.bucket/rollout_status` (SCRUM-132), kolom bantu staging, `input_maker_upload`, lampiran, undangan. | Review berkas `SCRUM-xx-schema.md` di `tickets/` — Tech lead / Data Steward | OPEN | 2026-10-23 |
| B-REG | SCRUM-26 | keputusan | Registry profil sebagai file konfigurasi berversi di repo (default yang dipakai) atau tabel. Default sudah diterapkan: `backend/src/lib/mapping/profiles.ts`. | Konfirmasi — Data Steward / Tech lead | OPEN (default dipakai) | 2026-10-26 |
| B-MAPOUT | SCRUM-31, 73 (sisa) | skema | Diputuskan 2026-10-27: hasil mapping **disimpan saat upload** (satu transaksi dengan staging). Sudah berlaku untuk Cashflow (`finance_transactions`/`_lines`) dan RAB (`rab_daily_budgets`/`rab_ingredient_budgets`). Sisa: tabel `menu_recipe_line` untuk MENU. | Skema tabel menu_recipe_line — Tech lead | OPEN (Cashflow & RAB selesai) | 2026-10-23 |
| B-LWG | SCRUM-132, 56 | keputusan (OD-01) | PRD §14: Lawang = Phase 1 comparison. BRD §1: Lawang = Phase 2 rollout (didahulukan). Dipakai PRD sebagai nilai config. | Konfirmasi OD-01 — Product + MBG | OPEN | 2026-10-23 |
| B-UPLOADER | SCRUM-5, 121 | keputusan (OD-07) | Uploader utama saat pilot. Default: siapa pun yang punya `upload:create` (SUPER_ADMIN, DATA_ADMIN). | Konfirmasi OD-07 — Product/Ops | OPEN | 2026-10-23 |
| B-ASSIGN | SCRUM-22 | dependensi tiket | SCRUM-22 In Progress tanpa assignee; sudah dikerjakan di branch lokal. | Konfirmasi boleh diambil alih — PM | OPEN | 2026-10-23 |
| B-TUREN | SCRUM-20, 132 | keputusan | Dapur Turen ada di seed tapi tidak punya kode kitchen (PRD hanya menyebut SKN, LWG, DNM, PCK, SML). | Kode resmi Turen — Product | OPEN | 2026-10-23 |
| B-FIXTURE-PII | SCRUM-35, 36, 118, 30 | sampel | Sampel nyata memuat nomor rekening dan nama penerima (Input Maker). Fixture yang di-commit dibuat **sintetis** (header & layout sama, nilai karangan). Sampel mentah tidak masuk repo. | Konfirmasi pendekatan ini cukup untuk UAT — Data Steward | OPEN | 2026-10-23 |
| B-AUTH0-FE | SCRUM-21 dst. (semua UI) | dependensi (TERTUTUP 2026-10-25: Auth0 dihapus, env frontend-admin disediakan Terraform) | Belum ada aplikasi Auth0 *Regular Web Application* untuk frontend-admin (tenant hanya punya M2M client). Task definition ECS frontend-admin juga belum punya env `AUTH0_*`, `APP_BASE_URL`, `API_BASE_URL`; tanpa itu login di staging gagal. Tidak dibuat sendiri karena mengubah tenant/infra. | Buat aplikasi (callback `<origin>/admin/auth/callback`, logout `<origin>/admin`) + secret di infra — Tech lead / DevOps | OPEN | 2026-10-23 |
| B-NEXT-CVE | frontend-admin | dependensi | `npm audit`: `next` 16.0.0–16.4.0 punya advisory **critical** (terpasang 16.3.1, sudah dipin sebelum sesi ini), plus 7 high (braces, sharp). Tidak di-upgrade diam-diam karena mengubah versi framework. | Keputusan upgrade Next — Tech lead | OPEN | 2026-10-23 |

## Selesai

| ID | Tiket | Deskripsi | Penyelesaian | Tanggal |
|---|---|---|---|---|
| B-SAMPLE-SKN-CF | SCRUM-35, 55, 27 | Sampel Cashflow Sukun belum ditemukan | Ditemukan `MBG_SPPG_Cashflow_Template_1.xlsx` (Drive `1pnfHNS0FgNBjqOSs2xjTdm-863PWan7t`): template resmi Sukun + Kamus_Data + baris nyata Mei 2026 | 2026-10-23 |
| B-RAW | SCRUM-28, 29, 30 | Staging generik vs per-domain | Dipilih generik: tabel `staging_rows` (Pilihan A), semua domain | 2026-10-26 |
| B-EMAIL | SCRUM-121 | Pengirim email undangan belum ada | Undangan (buat & kirim ulang) dikirim lewat SES (`lib/mailer.ts`); `emailed: false` bila SES tidak dikonfigurasi, tautan diserahkan manual | 2026-10-26 |
