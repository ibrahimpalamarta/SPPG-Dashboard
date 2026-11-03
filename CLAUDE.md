# Project Instructions — SPPG Dashboard

Instruksi ini berlaku untuk semua sesi Claude Code di repo ini. Ikuti secara ketat kecuali user memberi instruksi eksplisit yang bertentangan di chat.

## Konteks Proyek
- Repo: monorepo `dashboard_sppg` (GitHub: `ibrahimpalamarta/SPPG-Dashboard`)
- Backend: Node.js + TypeScript, Express, Prisma, autentikasi internal (password argon2id + sesi di Postgres, MFA TOTP — lihat `backend/docs/AUTH.md`)
- Database: PostgreSQL (data aplikasi dan akun/sesi/role semuanya di Postgres, tidak ada layanan identitas eksternal)
- Frontend: dua app Next.js (App Router) terpisah — `frontend-admin/` (Backoffice + Dashboard Internal, di belakang login internal) dan `frontend-public/` (dashboard transparansi publik). Keduanya baru berisi halaman statis "Segera Hadir": fondasi deployment sudah jalan ke staging, tapi desain UI/UX masih berjalan jadi belum ada halaman produk
- Monorepo tanpa workspace tool: tiap service punya `package.json` + lockfile sendiri, tidak ada root `package.json`
- RBAC 2 role (SCRUM-152): Admin (dulu PM MBG, semua dapur, tidak mengunggah/mem-publish) dan Data Operasional (`DATA_ADMIN`, terikat satu dapur, unggah dan Setujui & Publish sendiri, tanpa scope = tidak melihat apa pun). Tidak ada tahap review Admin (SCRUM-148). Tidak ada role Public/CMS
- Deployment: AWS ECS + ECR di belakang ALB, RDS, S3 assets bucket, region ap-southeast-3, environment staging & prod, CI/CD via GitHub Actions

## Prinsip Coding — Presisi & Ramping
1. **Jangan berasumsi.** Kalau requirement ambigu atau ada beberapa cara implementasi yang masuk akal, tanyakan dulu sebelum menulis kode, jangan menebak.
2. **Ikuti pola yang sudah ada** di codebase (struktur folder, penamaan, cara handle error, cara akses Prisma) — jangan perkenalkan pola baru tanpa alasan kuat.
3. **Minimal footprint.** Ubah/hasilkan kode seperlunya untuk menyelesaikan task. Jangan refactor file yang tidak diminta, jangan tambah fitur "sekalian".
4. **Tidak ada dead code** — hapus import, variabel, atau fungsi yang tidak terpakai. Tidak ada `console.log` debug yang tertinggal.
5. **Type-safe.** Hindari `any` kecuali benar-benar tidak ada pilihan; kalau terpaksa, beri komentar alasannya.
6. **Validasi input** di setiap endpoint baru (pakai pola validasi yang sudah dipakai di project, misalnya Zod/class-validator — cek dulu yang sudah ada).
7. **Keamanan dulu.** Untuk apapun yang menyentuh auth/RBAC, jangan longgarkan permission check demi mempercepat development.
8. Sebelum submit hasil kerja, jalankan lint/type-check yang tersedia di project sebelum menganggap task selesai.

## Penggunaan Plugin `/ponytail`
- Gunakan plugin `/ponytail` untuk task coding di repo ini agar penggunaan token hemat dan output code tetap ramping.
- Prioritaskan `/ponytail` di atas pendekatan default kalau task-nya coding (bukan diskusi/brainstorming).

## Sinkronisasi Jira (tiket SCRUM)
Setiap fitur/perbaikan yang dikerjakan berdasarkan tiket langsung diperbarui di Jira, tanpa menunggu diminta:
- **Mulai mengerjakan:** pindahkan tiket dari To Do ke In Progress (transition id 21).
- **Selesai dengan keyakinan 100%:** lint/type-check/test lolos dan semua AC tiket terpenuhi. Tambahkan komentar Bahasa Indonesia (yang dikerjakan, link PR, cara menguji, blocker tersisa), sertakan screenshot Playwright lewat `npm run evidence -- SCRUM-xx` di `qa-audit/` bila ada UI test yang lolos (jangan memalsukan bukti), lalu pindahkan ke In Review (transition id 31).
- **Belum 100% yakin:** tetap di In Progress dan tulis alasannya di komentar.
- **Tidak pernah Done:** user yang menutup tiket setelah review. Hanya ubah tiket yang sedang dikerjakan, jangan tiket lain.

## Git Workflow
- **Jangan pernah push langsung ke `develop` atau `main`.**
- Setiap fitur/perbaikan dikerjakan di branch baru dari `develop`, dengan format:
  `feature/<nama-fitur-singkat>` untuk fitur baru, `fix/<nama-bug>` untuk bugfix.
- Setelah kerjaan di satu fitur selesai dan siap direview, push branch tersebut (bukan merge langsung) — biarkan proses merge ke `develop` lewat Pull Request.
- Satu branch = satu fitur/scope. Jangan campur beberapa fitur tidak berhubungan dalam satu branch/PR.
- Commit message singkat, jelas, present-tense (contoh: `add RBAC middleware for data admin role`).
- Sebelum membuat branch baru, pastikan branch lokal `develop` sudah pull terbaru dulu.