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
Branch lokal SCRUM-20/22 sudah memigrasi `user_kitchen_scopes`, `kitchens.code`, dan kolom `upload_batches` di luar daftar [PRD]. Atas keputusan user, migrasi itu dipertahankan. Proposal ditulis setelahnya (`tickets/access/rbac/SCRUM-20-schema.md`, `tickets/upload/batch/SCRUM-22-schema.md`), dan branch tidak di-push sampai disetujui (B-SCHEMA). Skema baru mulai tiket berikutnya mengikuti gate: tanpa migrasi, pakai interface + in-memory.

**D-02 · 2026-10-23 · Branch ditumpuk linear.**
`projects/jira/` diubah oleh setiap tiket, sehingga branch paralel dari `develop` pasti konflik. Rantainya: `develop → feature/scrum-20-rbac → feature/scrum-22-upload-batch → feature/jira-tracking → feature/scrum-21-app-shell → …`, satu branch per unit sesuai urutan bagian D. PR di-merge berurutan. Ini menyimpang dari CLAUDE.md ("branch dari develop") demi menghindari konflik pelacakan.

**D-03 · 2026-10-23 · Tidak ada push.** Semua branch lokal; user yang push.

**D-04 · 2026-10-23 · Pelacakan pindah ke `projects/jira/`.** Isi `docs/jira-progress.md` (sesi 22 Okt) dipindahkan ke berkas tiket, dan berkas lama dihapus supaya hanya ada satu sumber.

**D-05 · 2026-10-23 · ASUMSI peran (B-ROLE).** PM MBG = `SUPER_ADMIN` (semua permission). Data Admin/PIC Kitchen = `DATA_ADMIN` (upload + lihat, kitchen sendiri). `INTERNAL` tetap view-only. Role lain di PRD §3 tinggal ditambah ke `ROLE_PERMISSIONS`.

**D-10 · 2026-10-25 · Auth0 diganti auth internal (password argon2id + sesi di Postgres, MFA TOTP).** Menggantikan D-06 dan D-09 (Auth0 dan `@auth0/nextjs-auth0` dihapus). Role tetap enum yang sama; peta role → permission pindah ke tabel `role_permissions` (bisa diubah tanpa deploy). Tanpa email dulu: undangan/reset lewat link dari Super Admin. Rincian: `backend/docs/AUTH.md`.

**D-06 · 2026-10-23 · (DIGANTIKAN oleh D-10) Role disimpan di Postgres, bukan claim Auth0.** Claim hanya dipakai saat akun pertama kali dibuat (keputusan sesi 22 Okt). Mencabut role di Auth0 tidak berefek; perubahan role harus lewat admin API. Ini prasyarat SCRUM-121/122.

**D-07 · 2026-10-23 · UI dibangun di atas mockup yang ada.** `frontend-admin` memakai Next 16 + Tailwind 4 + lucide-react. Mockup (overview/finance/kelengkapan/unggah-data) dipakai sebagai dasar layout; seluruh angka palsu (`lib/mock/*`) dihapus.

**D-08 · 2026-10-23 · Fixture sintetis (B-FIXTURE-PII).** Fixture test meniru header & layout sampel nyata, dengan nilai karangan. Sampel mentah tidak masuk repo.

**D-09 · 2026-10-23 · (DIGANTIKAN oleh D-10) Auth0 di frontend: `@auth0/nextjs-auth0` 4.31.1, dipin exact.** Ini SDK resmi untuk Next App Router dan mendukung Next 16 (`proxy.ts`). Dipilih versi berumur ≥ 2 minggu: 4.33.0 terbit 22 Okt, terlalu baru untuk dipasang. Sesi di cookie terenkripsi, tanpa store baru. Satu-satunya dependensi baru di SCRUM-21.

**D-10 · 2026-10-23 · Halaman ↔ permission.** Overview, Finance & Cost, Data Health = `dashboard:view`; Unggah Data = `upload:view`; Mapping & Validasi = `mapping:view`; Data Reference = `reference:view`; Manual / Quick Entry = `upload:create` (fallback hanya untuk yang boleh memasukkan data). Slug URL Bahasa Indonesia mengikuti mockup (`/unggah-data`, `/kesehatan-data`, …). Label menu mengikuti nama halaman PRD §5.

**D-11 · 2026-10-23 · Tidak ada `loading.tsx` level layout.** Boundary loading di `(app)` membuat `forbidden()` keluar dengan HTTP 200. Halaman yang nanti mengambil data memasang `<Suspense>` **setelah** `requirePage()`.

**D-12 · 2026-10-23 · Kontrak Cashflow Upload v1 = template Sukun.** `MBG_SPPG_Cashflow_Template_1.xlsx` (SPPG Kebonsari Sukun) dipakai sebagai kontrak Cashflow, karena ia satu-satunya sumber dengan Kamus_Data per kolom. Nama berkas "Template_1" dibaca sebagai v1. **ASUMSI**: belum dikonfirmasi bahwa ini "Cashflow Upload v1" yang dimaksud PRD §12.

**D-13 · 2026-10-23 · `Insentif_Penggajian` tidak di-staging.** Sheet ini berisi nama, nomor rekening, dan pemilik rekening per orang. Nominalnya sudah ada di baris `Transaksi_Kas` (tipe INSENTIF/PENGGAJIAN), jadi analitik finance tidak kehilangan apa pun. Minimalkan data pribadi (PRD §2, OS8, NFR-02). Berkas asli tetap di S3 untuk audit. Kolom `no_rekening` di `Transaksi_Kas` (rekening **pemasok**) tetap di-staging mentah dan tidak boleh tampil di UI/export.

**D-14 · 2026-10-23 · Registry parser = map statis.** `registerParser()` dari SCRUM-24 diganti objek `parsers` di `pipeline.ts`: lebih sedikit kode, tanpa efek samping saat import, dan tidak ada siklus import.

**D-16 · 2026-10-30 · Tahap 3–7 hanya Sukun, tabel baru dimigrasi di branch.** Atas keputusan user: tiket non-Sukun (SCRUM-32/56/57/58) tetap To Do. Tabel [USULAN] Tahap 3–7 langsung dimigrasi di branch bertumpuk `feature/tahap3-…` → `tahap4-…` → `tahap5-…` → `tahap6-…` → `tahap7-…`, dengan `SCRUM-xx-schema.md` di folder tiket; review PR = persetujuan skema. Tiket yang sumbernya belum ada (B-SRC-SKN) tetap dibangun tabel/query/widget-nya tanpa mapping karangan.

**D-17 · 2026-10-30 · ASUMSI izin alur review (SCRUM-51/117/95).** Tandai temuan sudah dicek dan Kirim ke PM = `upload:create` (pembuat data, Data Operasional). Kembalikan dan Publish = `batch:publish` (PM MBG, Data Steward). Pengunggah tidak boleh mem-publish batch miliknya sendiri, meskipun memegang keduanya (Data Steward). Catat pelaporan ke pemerintah = `batch:publish`. Tidak ada status enum baru: READY = "Menunggu Review PM", NEEDS_REVIEW + `errorCode RETURNED` = "Dikembalikan".

**D-18 · 2026-10-30 · Kunci bisnis publish (SCRUM-78).** Finance: kitchen + `txn_id` + `txn_date` (Sukun memberi nomor `TXN-B0001` lagi tiap periode). RAB: kitchen + tanggal + segmen. Menu: kitchen + tanggal + segmen + menu + bahan. Payment: kitchen + `payment_request_id`. Baris lama ditandai `superseded_by_batch_id`, tidak dihapus. Koreksi yang mengubah tanggal memakai `replaces`, yang menutup seluruh batch lama saat koreksi dipublish.

**D-19 · 2026-10-30 · Eligibility KPI (SCRUM-54).** `ELIGIBLE_REVIEW_STATUSES = ['TERKONFIRMASI']` di `backend/src/lib/publish.ts`: konstanta kode, berubah lewat deploy. KPI hanya membaca batch PUBLISHED, baris yang tidak superseded, dan (untuk finance) review status eligible.

## Konflik dokumen

**K-01 · OD-01 Lawang (B-LWG).** PRD §0/§14: Lawang = "Phase 1 comparison", masuk setelah alur Sukun stabil. BRD §1 "Kitchen mana yang didahulukan": Lawang = "Phase 2 – rollout", didahulukan dari DNM/PCK. **Dipakai PRD**, sebagai nilai config `rollout_status`, bukan hardcode.

**K-02 · Simalungun.** PRD §14: SML = Phase 2b. BRD §1: SML = "Phase 1 – perbaikan" (proses/report), lalu "Phase 2 – connect" setelah 4 minggu konsisten. Keduanya konsisten bahwa **data** SML baru masuk dashboard di Phase 2. Dipakai PRD (Phase 2b).

**K-03 · Nama field Pengeluaran.** BRD §5.3 memakai prefiks `exp_*` (`exp_nilai_rp`, `exp_no_bukti`, …). PRD §6.5/§7.4 memakai `transaction_total`, `line_amount`, `review_status`. Aturan: **Data Dictionary v0.2 menang**, tapi berkas itu belum ada (B-DD). Sementara itu, profil memakai nama PRD bila disebut eksplisit dan nama BRD untuk sisanya, ditandai `TODO(B-DD)`.

**K-04 · Sampel vs tiket.** SCRUM-118 menyebut Input Maker **Sukun**. Di Drive ada `Input Maker .xlsx` (milik sppgkebonsarisukun, berarti Sukun) dan `Input Maker – SPPG Simalungun`. Sesi 22 Okt hanya menemukan yang SML. Dipakai yang Sukun untuk SCRUM-118.

**K-05 · Layout Cashflow beda per dapur.** Sukun: 3 sheet ternormalisasi (`Transaksi_Kas` + `Rincian_Belanja` + `Insentif_Penggajian`). Donomulyo: 1 sheet "Transaksi Kas" yang menggabungkan header dan item (`id, txn_id, …, jumlah_baris, total, …`). Parser staging menerima keduanya; pembedaan layout menjadi tugas profil mapping (SCRUM-26/39), bukan parser.

**K-06 · Siapa yang mem-publish (SCRUM-95 vs SCRUM-117).** Deskripsi Jira SCRUM-95: "Publish oleh Data Operasional (otomatis saat lolos cek, Pakai Usulan & Publish, atau Setujui & Publish) tanpa review Admin". SCRUM-117 dan TASKLIST T23.4: status "Menunggu Review PM" & "Dikembalikan", publish "hanya PM MBG, setelah review". Implementasi mengikuti SCRUM-117/TASKLIST (D-17). Bila SCRUM-95 yang berlaku, cukup ubah izin route `POST /upload-batches/:id/publish` dan alur tombol; logika publish/supersede tetap. **Perlu keputusan Product/PM MBG.**
