# Infrastruktur AWS — SPPG Dashboard

Terraform + GitHub Actions untuk 2 environment AWS yang berdiri sendiri (`staging`, `production`) — masing-masing punya VPC, ECS cluster, RDS, ECR, S3, state bucket, dan IAM role deploy sendiri, tanpa resource yang dipakai bersama kecuali OIDC provider (singleton per account). Didesain **migration-ready**: saat ini jalan di AWS account personal, dan pindah ke account kantor nanti hanya butuh ganti *value* (Account ID, region, role ARN) tanpa mengubah kode/struktur apa pun.

Branch `develop` **bukan** environment: ia hanya branch transisi di GitHub (kena CI gate, tidak pernah di-deploy). Yang di-deploy dan bisa diakses hanya `staging` dan `production`.

## Struktur

```
infra/
├── backend-bootstrap/   # one-time: state bucket + lock table + OIDC provider + IAM role deploy
├── modules/             # network, ecr, database, storage, compute, iam-oidc
├── environments/
│   ├── staging/
│   └── production/
└── README.md
```

Kedua environment memakai module yang sama persis (`main.tf`-nya identik); yang membedakan hanya `variables.tf` — `env`, blok CIDR VPC (`staging` 10.10.0.0/16, `production` 10.20.0.0/16, sengaja tidak overlap supaya VPC peering tetap mungkin nanti), dan sizing (staging: 1 task, `db.t4g.micro`, single-AZ; production: 2 task, `db.t4g.small`, multi-AZ).

Kenapa OIDC provider dan kedua IAM role dibuat di `backend-bootstrap`, bukan di `environments/*`: OIDC provider adalah resource singleton per AWS account (gagal jika dibuat dua kali), dan GitHub Actions butuh role itu sudah ada sebelum bisa autentikasi — jadi harus diprovision manual, sekali, pakai credential admin lokal. `environments/*` sesudahnya hanya mengelola infrastruktur aplikasi (VPC, ECS, RDS, ECR, S3) dan tidak pernah menyentuh IAM/OIDC.

## Provisioning Pertama Kali

Prasyarat: AWS CLI ter-konfigurasi dengan **credential admin dari akun AWS personal** (`aws configure` atau SSO profile). Ini satu-satunya tempat di seluruh desain ini yang memakai credential jangka panjang/admin.

1. **Bootstrap** (state bucket, lock table, OIDC provider, 2 IAM role):
   ```bash
   cd infra/backend-bootstrap
   cp terraform.tfvars.example terraform.tfvars
   # isi account_id, github_org, github_repo di terraform.tfvars
   terraform init
   terraform apply
   terraform output   # catat staging_role_arn, production_role_arn, state_bucket_names, lock_table_names
   ```

2. **Environment `staging`** (masih pakai credential admin lokal untuk apply pertama):
   ```bash
   cd ../environments/staging
   cp terraform.tfvars.example terraform.tfvars
   cp backend-staging.hcl.example backend-staging.hcl
   # isi kedua file dengan value dari output langkah 1

   terraform init -backend-config=backend-staging.hcl
   terraform apply
   ```
   Task definition ECS akan mereferensikan image `:latest` yang belum ada di ECR pada apply pertama ini — service ECS akan menunjukkan task gagal sampai image pertama di-push (baik manual maupun lewat CI run pertama). Ini normal/transient.

3. **Environment `production`**: ulangi langkah yang sama di folder `environments/production` (pakai `backend-production.hcl.example`).

4. **GitHub Environments** — di repo Settings → Environments, buat environment `staging` dan `production` (tidak ada environment `develop`). Isi Variables di masing-masing environment (lihat tabel di bawah) dengan value dari `terraform output` environment yang sesuai + output bootstrap. Dua konfigurasi manual satu kali lewat GitHub UI, **bukan** dikelola Terraform:

   - **Deployment branches** (wajib, ini yang menegakkan pembatasan branch): `staging` → *Selected branches* → `staging`; `production` → `main` + tag `v*`. IAM tidak lagi mengunci branch, karena setiap job deploy memakai `environment:` sehingga GitHub mengirim sub claim `repo:<org>/<repo>:environment:<nama>` — bentuk `ref:refs/heads/<branch>` tidak pernah muncul.
   - **Required reviewers** pada `production` (protection rule) — inilah gate approval manual sebelum deploy prod.

5. PR ke `develop`/`staging`/`main` **dan push langsung ke `develop`** → trigger `ci.yml`: build + test backend, `terraform fmt`/`validate` ketiga root module. Gate saja: tanpa environment GitHub, tanpa credential AWS, tanpa resource yang disentuh. Push ke `develop` ikut digate karena `develop` tidak punya deploy workflow yang akan menangkap error-nya.

6. `develop` adalah branch transisi, tidak pernah di-deploy. Naik ke staging lewat PR `develop` → `staging`; merge-nya yang memicu `deploy-staging.yml` (environment `staging`): verifikasi OIDC auth, gate test/build, build+push image, migrasi DB, `terraform apply` dari CI, sampai ECS service healthy.

7. Push tag `v*` atau merge `staging` ke `main` → trigger `deploy-prod.yml`, approve manual gate di GitHub UI, verifikasi hal yang sama di production.

### GitHub Environment Variables

Buat dengan key yang sama di environment `staging` dan `production`, isi value berbeda per environment:

| Variable | Isi |
|---|---|
| `AWS_REGION` | `ap-southeast-3` — harus region tempat state bucket & VPC berada |
| `AWS_ROLE_ARN` | ARN role OIDC (dari `backend-bootstrap` output) |
| `TF_STATE_BUCKET`, `TF_LOCK_TABLE` | Dari `backend-bootstrap` output |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ROLES_CLAIM` | Tenant Auth0 environment tsb — bukan rahasia, API hanya memverifikasi token |

Tujuh variable, itu saja. Yang sengaja **tidak** ada di sini:

- `ECR_BACKEND_URL` / `ECR_FRONTEND_URL` — URL repository ECR sudah jadi `terraform output` di tiap environment, jadi workflow membacanya dari sana. Satu nilai lebih sedikit yang bisa basi saat pindah akun.
- `AWS_ACCOUNT_ID` — hanya dipakai `backend-bootstrap` (untuk menyusun ARN di policy IAM), bukan oleh environment stack.
- `GITHUB_ORG` / `GITHUB_REPO_NAME` — sama, hanya dipakai `backend-bootstrap`. Lagi pula GitHub **menolak** nama variable/secret berawalan `GITHUB_`, jadi keduanya memang tidak akan pernah bisa dibuat.

Tidak ada AWS secret jangka panjang yang perlu disimpan — OIDC menghilangkan kebutuhan itu sepenuhnya.

## Checklist Migrasi: Akun Personal → Akun Kantor

1. **Akses akun kantor**: siapkan credential admin/SSO untuk akun AWS kantor, pastikan region `ap-southeast-3` sudah aktif di akun tsb — Jakarta adalah region *opt-in*, jadi harus di-enable manual lewat Console → Account → AWS Regions sebelum API call apa pun ke sana bisa jalan.
2. **Re-run `backend-bootstrap`** dengan `account_id` baru di `terraform.tfvars`, jalankan `terraform init && apply` **memakai credential admin akun kantor**. Ini membuat state bucket/lock table/OIDC provider/IAM role baru yang sepenuhnya independen dari akun personal — tidak menyentuh resource lama.
3. **Putuskan strategi data**: (a) fresh start — provision environment dari nol di akun baru (paling simpel, cocok jika belum ada data produksi nyata), atau (b) migrasi data — RDS snapshot export/import, sync S3, re-push image ke ECR akun baru. Pilih sesuai kondisi saat migrasi.
4. **Re-run `terraform init -reconfigure` + `apply`** di tiap `environments/<env>` mengarah ke state bucket akun baru (dari output langkah 2). Ini provision VPC/ECS/RDS/ECR/S3 baru di akun kantor.
5. **Update GitHub Environment variables** (staging & production): `AWS_ROLE_ARN`, `TF_STATE_BUCKET`, `TF_LOCK_TABLE` (region biasanya tetap `ap-southeast-3`). **Tidak ada perubahan kode/workflow** — inilah inti dari desain ini.
6. **Cutover DNS** (jika sudah ada domain kustom) mengarah ke ALB DNS name akun baru.
7. **Verifikasi full deploy cycle** di akun kantor (PR `develop` → `staging`, lalu tag rilis prod) sebelum mematikan apa pun di akun personal.
8. **Decommission akun personal**: `terraform destroy` tiap environment (staging dulu, baru production), lalu hapus resource `backend-bootstrap` (OIDC provider, IAM role, state bucket — setelah yakin tidak ada yang masih butuh histori state-nya; sebaiknya arsipkan dulu file `.tfstate` terakhir sebelum bucket dihapus).
9. **Cabut/rotate** credential admin lokal akun personal yang dipakai untuk bootstrap.

## Catatan Desain / Trade-off yang Disengaja

- **NAT gateway hanya di production**, 1 buah (bukan per-AZ) — single point of failure untuk egress private subnet; tingkatkan ke NAT per-AZ nanti kalau availability jadi prioritas. **Staging tidak punya NAT sama sekali** (`enable_nat_gateway = false`): dengan ~$45/bulan hanya untuk memberi egress ke satu task 0.25 vCPU, biayanya tidak sepadan. Staging menjalankan ECS task-nya di public subnet dengan public IP (`task_subnet_ids` + `task_assign_public_ip` di module `compute`). Ini bukan pelonggaran keamanan: security group `ecs-tasks` tetap hanya menerima ingress dari SG ALB, dan RDS tetap di private subnet yang — tanpa NAT — kini benar-benar tidak punya rute keluar sama sekali. Konsekuensinya, task migrasi di workflow staging harus jalan di subnet yang sama dengan `assignPublicIp=ENABLED`, kalau tidak ia tak bisa menarik image dari ECR.
- **Staging dimatikan di luar jam kerja** (module `scheduler`, staging saja). EventBridge Scheduler memanggil `ecs:UpdateService` dan `rds:Stop/StartDBInstance` langsung lewat universal target — tanpa Lambda, tanpa kode. Default: nyala 07:00–21:00 WIB, Senin–Jumat (cron ditulis dalam `Asia/Jakarta`, jadi tidak perlu hitung UTC). Dua konsekuensi yang sudah ditangani: (1) `aws_ecs_service.backend` memakai `ignore_changes = [desired_count]` supaya Terraform tidak berkelahi dengan scheduler — artinya `var.desired_count` jadi nilai create-time di **semua** environment, dan perubahan setelahnya harus lewat `aws ecs update-service`; (2) workflow deploy staging punya step "Wake staging database" dan "Scale backend service up", supaya deploy di luar jam kerja tidak gagal dengan connection timeout. Storage RDS tetap ditagih saat instance berhenti — yang hemat hanya jam compute-nya.
- **HTTPS opsional**: listener 443/ACM di ALB dikontrol lewat variable `acm_certificate_arn` (default kosong = HTTP saja). Begitu ada domain, isi variable ini — tidak perlu ubah struktur module.
- **CloudFront tidak dibuat** di first pass ini (ALB sudah cukup untuk awal, S3 assets bucket tetap private). Tambahkan CloudFront di depan ALB dan/atau S3 nanti kalau kebutuhan caching/TLS-edge/WAF/akses publik ke asset sudah jelas.
- **`terraform apply` jalan di setiap deploy** (bukan pipeline terpisah untuk "infra" vs "update image"), dengan image tag (commit SHA) sebagai variable yang memicu perubahan task definition. Ini menghindari state drift dari dua jalur deploy yang terpisah; ketika hanya image yang berubah, apply hampir no-op karena cuma 2 resource yang berubah (task definition + service).
- **Migrasi DB lewat ECS one-off task**, bukan entrypoint container: RDS `publicly_accessible = false` dan security group-nya hanya menerima ingress dari SG ECS, jadi runner GitHub tidak bisa connect langsung. Workflow me-register task definition `<prefix>-migrate` (image sama, command `prisma migrate deploy`) lewat `terraform apply -target`, menjalankannya dengan `aws ecs run-task`, lalu menggagalkan job kalau exit code-nya bukan 0 — semuanya **sebelum** service di-update, sehingga skema selalu mendahului kode yang memakainya. Dipilih di atas entrypoint karena kegagalan migrasi jadi terlihat di log Actions, bukan cuma jadi crashloop diam di CloudWatch.
- **IAM policy role deploy dipecah dua**: `deploy-app-policy` (ECR/ECS/PassRole, di-scope ketat by ARN) dan `deploy-infra-policy` (permission Terraform yang lebih luas untuk resource seperti EC2/RDS/ELB yang memang tidak mendukung resource-level IAM di banyak action-nya). Ini batas realistis "least privilege" untuk role yang juga menjalankan `terraform apply` dari CI.
- Password database RDS di-generate otomatis (`random_password`) dan disimpan di Secrets Manager — tidak pernah muncul sebagai plaintext di tfvars, state Terraform (yang selalu berisiko), atau GitHub secret.
