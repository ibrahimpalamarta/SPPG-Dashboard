# SPPG Dashboard

Platform program **Makan Bergizi Gratis (MBG)** yang mengkonsolidasikan data
operasional, gizi, dan keuangan dari dapur SPPG.

Monorepo dengan tiga service yang di-deploy terpisah, plus satu stack
infrastruktur. Konvensinya folder saja — tidak ada npm/pnpm workspace, tidak ada
Turborepo: tiap service berdiri sendiri dengan `package.json` dan lockfile-nya
masing-masing, dan tiap job CI bekerja di `working-directory` yang sesuai.

## Service

| Folder | Isi | Stack | URL staging |
|---|---|---|---|
| [`backend/`](backend/README.md) | REST API, auth + RBAC | Express, TypeScript, Prisma, Auth0 | `/api/*`, `/health` |
| [`frontend-admin/`](frontend-admin/README.md) | Backoffice + Dashboard Internal | Next.js (App Router) | `/admin` |
| [`frontend-public/`](frontend-public/README.md) | Dashboard transparansi publik | Next.js (App Router) | `/` |
| [`infra/`](infra/README.md) | Terraform: VPC, ECS, RDS, ECR, S3, ALB | Terraform, AWS `ap-southeast-3` | — |

Kedua frontend saat ini masih halaman statis "Segera Hadir" — desain UI/UX masih
berjalan. Yang sudah selesai adalah fondasi deployment-nya, supaya pembangunan
halaman nanti tidak perlu menyentuh infra lagi.

RBAC punya 4 role: Super Admin, Data Admin (per dapur SPPG), Internal
(view-only), dan Public (visualisasi insight).

## Routing

Ketiga service berbagi satu ALB. Selama belum ada domain dan sertifikat ACM,
pembagiannya lewat path — bukan hostname:

```
ALB :80
 ├─ priority 5    /health              → backend
 ├─ priority 10   /api/*               → backend
 ├─ priority 20   /admin, /admin/*     → frontend-admin   (basePath "/admin")
 └─ default                            → frontend-public
```

Rule priority 20 berpasangan dengan `basePath: "/admin"` di
`frontend-admin/next.config.ts` — ubah salah satu, ubah keduanya. Begitu domain
tersedia, isi `acm_certificate_arn` dan routing bisa pindah ke host-based.

## Environment

Hanya `staging` dan `production` yang di-deploy dan bisa diakses. `develop`
adalah branch transisi: kena gate CI, tidak pernah di-deploy.

```
feature/* ─PR─> develop ─PR─> staging ─PR/tag v*─> main
   fix/*         (CI gate)    (auto deploy)      (deploy + approval manual)
```

Jangan pernah push langsung ke `develop`, `staging`, atau `main`. Satu branch =
satu fitur.

| Branch | Workflow | Efek |
|---|---|---|
| PR ke `develop`/`staging`/`main`, push ke `develop` | `ci.yml` | Build+test backend, build kedua frontend, `terraform fmt`/`validate`. Tanpa kredensial AWS. |
| push ke `staging` | `deploy-staging.yml` | Build+push 3 image, migrasi DB, `terraform apply`, tunggu ketiga service stabil. |
| push ke `main` atau tag `v*` | `deploy-prod.yml` | Sama, di belakang approval manual. Frontend belum di-deploy ke production. |

Deploy staging membangun ketiga image dan menjalankan **satu** `terraform apply`
yang memegang semua image tag sekaligus. Itu sebabnya tidak ada workflow
per-service: apply terpisah akan saling menimpa tag milik service lain kembali
ke `latest`.

Detail infrastruktur, IAM/OIDC, penghematan biaya staging, dan checklist migrasi
akun AWS ada di [`infra/README.md`](infra/README.md).

## Mulai dari nol

```bash
cd backend        && npm ci && npm run dev    # :8080
cd frontend-admin && npm ci && npm run dev    # :3000/admin
cd frontend-public && npm ci && npm run dev   # :3000
```

Node 22 (backend menuntut `>=20.11`). Backend butuh `.env` — lihat
`backend/.env.example`. Kedua frontend belum membaca environment variable apa pun.
