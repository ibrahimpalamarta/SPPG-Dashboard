# Project Instructions — SPPG Dashboard

Instruksi ini berlaku untuk semua sesi Claude Code di repo ini. Ikuti secara ketat kecuali user memberi instruksi eksplisit yang bertentangan di chat.

## Konteks Proyek
- Repo: monorepo `dashboard_sppg` (GitHub: `ibrahimpalamarta/SPPG-Dashboard`)
- Backend: Node.js + TypeScript, Express, Prisma, Auth0 untuk autentikasi
- Database: PostgreSQL (data aplikasi tetap di Postgres, auth didelegasikan ke Auth0)
- Frontend: folder masih kosong, belum digarap — fokus backend dulu
- RBAC 4 role: Super Admin, Data Admin/entry (per-SPPG Dapur), Internal (view-only), Public (insight visualisasi)
- Deployment: AWS ECS + ECR di belakang ALB, RDS, S3 assets bucket, region ap-southeast-2, environment staging & prod, CI/CD via GitHub Actions

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

## Git Workflow
- **Jangan pernah push langsung ke `develop` atau `main`.**
- Setiap fitur/perbaikan dikerjakan di branch baru dari `develop`, dengan format:
  `feature/<nama-fitur-singkat>` untuk fitur baru, `fix/<nama-bug>` untuk bugfix.
- Setelah kerjaan di satu fitur selesai dan siap direview, push branch tersebut (bukan merge langsung) — biarkan proses merge ke `develop` lewat Pull Request.
- Satu branch = satu fitur/scope. Jangan campur beberapa fitur tidak berhubungan dalam satu branch/PR.
- Commit message singkat, jelas, present-tense (contoh: `add RBAC middleware for data admin role`).
- Sebelum membuat branch baru, pastikan branch lokal `develop` sudah pull terbaru dulu.