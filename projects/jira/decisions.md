# Keputusan, asumsi, dan konflik dokumen

Format: ID · tanggal · keputusan · alasan · rujukan. Asumsi yang belum disetujui
ditandai **ASUMSI**, dan blocker-nya dirujuk.

## Dokumen sumber yang dipakai

| Dokumen | Lokasi | Catatan |
|---|---|---|
| PRD SPPG Internal Dashboard v0.1 (8 Okt 2026) | Drive `1kBwyixbJadujNz0pT1dfJCZ6LIMwJXgbdw5TW0KJqpc` | Rujukan utama §3, 5, 6, 7, 9, 11, 14, 15 |
| BRD for Internal Recommendation v.2 | Drive `1Zy1Mms_v1n327zDs11nJQC6p4JF-__di` | Rujukan §1 (urutan kitchen), §4 (spesifikasi dictionary), §5.3–5.4 |
| SPPG Data points / PRD short version (Agustus) | lihat `backend/prisma/README.md` | Dasar skema ERD yang sudah ada di develop |
| Data Dictionary v0.2, Clickable Prototype v0.2 | **tidak ditemukan** | B-DOCS |

## Keputusan

**D-01 · 2026-10-23 · Skema yang sudah termigrasi dipertahankan, lalu diusulkan.**
Branch lokal SCRUM-20/22 sudah memigrasi `user_kitchen_scopes`, `kitchens.code`, dan kolom `upload_batches` di luar daftar [PRD]. Atas keputusan user, migrasi itu dipertahankan. Proposal ditulis setelahnya (`schema-proposals/SCRUM-20.md`, `SCRUM-22.md`), dan branch tidak di-push sampai disetujui (B-SCHEMA). Skema baru mulai tiket berikutnya mengikuti gate: tanpa migrasi, pakai interface + in-memory.

**D-02 · 2026-10-23 · Branch ditumpuk linear.**
`projects/jira/` diubah oleh setiap tiket, sehingga branch paralel dari `develop` pasti konflik. Rantainya: `develop → feature/scrum-20-rbac → feature/scrum-22-upload-batch → feature/jira-tracking → feature/scrum-21-app-shell → …`, satu branch per unit sesuai urutan bagian D. PR di-merge berurutan. Ini menyimpang dari CLAUDE.md ("branch dari develop") demi menghindari konflik pelacakan.

**D-03 · 2026-10-23 · Tidak ada push.** Semua branch lokal; user yang push.

**D-04 · 2026-10-23 · Pelacakan pindah ke `projects/jira/`.** Isi `docs/jira-progress.md` (sesi 22 Okt) dipindahkan ke berkas tiket, dan berkas lama dihapus supaya hanya ada satu sumber.

**D-05 · 2026-10-23 · ASUMSI peran (B-ROLE).** PM MBG = `SUPER_ADMIN` (semua permission). Data Admin/PIC Kitchen = `DATA_ADMIN` (upload + lihat, kitchen sendiri). `INTERNAL` tetap view-only. Role lain di PRD §3 tinggal ditambah ke `ROLE_PERMISSIONS`.

**D-06 · 2026-10-23 · Role disimpan di Postgres, bukan claim Auth0.** Claim hanya dipakai saat akun pertama kali dibuat (keputusan sesi 22 Okt). Mencabut role di Auth0 tidak berefek; perubahan role harus lewat admin API. Ini prasyarat SCRUM-121/122.

**D-07 · 2026-10-23 · UI dibangun di atas mockup yang ada.** `frontend-admin` memakai Next 16 + Tailwind 4 + lucide-react. Mockup (overview/finance/kelengkapan/unggah-data) dipakai sebagai dasar layout; seluruh angka palsu (`lib/mock/*`) dihapus.

**D-08 · 2026-10-23 · Fixture sintetis (B-FIXTURE-PII).** Fixture test meniru header & layout sampel nyata, dengan nilai karangan. Sampel mentah tidak masuk repo.

## Konflik dokumen

**K-01 · OD-01 Lawang (B-LWG).** PRD §0/§14: Lawang = "Phase 1 comparison", masuk setelah alur Sukun stabil. BRD §1 "Kitchen mana yang didahulukan": Lawang = "Phase 2 – rollout", didahulukan dari DNM/PCK. **Dipakai PRD**, sebagai nilai config `rollout_status`, bukan hardcode.

**K-02 · Simalungun.** PRD §14: SML = Phase 2b. BRD §1: SML = "Phase 1 – perbaikan" (proses/report), lalu "Phase 2 – connect" setelah 4 minggu konsisten. Keduanya konsisten bahwa **data** SML baru masuk dashboard di Phase 2. Dipakai PRD (Phase 2b).

**K-03 · Nama field Pengeluaran.** BRD §5.3 memakai prefiks `exp_*` (`exp_nilai_rp`, `exp_no_bukti`, …). PRD §6.5/§7.4 memakai `transaction_total`, `line_amount`, `review_status`. Aturan: **Data Dictionary v0.2 menang**, tapi berkas itu belum ada (B-DD). Sementara itu, profil memakai nama PRD bila disebut eksplisit dan nama BRD untuk sisanya, ditandai `TODO(B-DD)`.

**K-04 · Sampel vs tiket.** SCRUM-118 menyebut Input Maker **Sukun**. Di Drive ada `Input Maker .xlsx` (milik sppgkebonsarisukun, berarti Sukun) dan `Input Maker – SPPG Simalungun`. Sesi 22 Okt hanya menemukan yang SML. Dipakai yang Sukun untuk SCRUM-118.
