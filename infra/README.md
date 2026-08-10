# Infrastruktur AWS — dashboard_sppg

Terraform + GitHub Actions untuk 2 environment (`staging`, `production`), didesain **migration-ready**: saat ini jalan di AWS account personal, dan pindah ke account kantor nanti hanya butuh ganti *value* (Account ID, region, role ARN) tanpa mengubah kode/struktur apa pun.

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

Kenapa OIDC provider dan kedua IAM role dibuat di `backend-bootstrap`, bukan di `environments/*`: OIDC provider adalah resource singleton per AWS account (gagal jika dibuat dua kali), dan GitHub Actions butuh role itu sudah ada sebelum bisa autentikasi — jadi harus diprovision manual, sekali, pakai credential admin lokal. `environments/staging` dan `environments/production` sesudahnya hanya mengelola infrastruktur aplikasi (VPC, ECS, RDS, ECR, S3) dan tidak pernah menyentuh IAM/OIDC.

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

4. **GitHub Environments** — di repo Settings → Environments, buat environment `staging` dan `production`. Untuk `production`, aktifkan **Required reviewers** (protection rule) — ini konfigurasi manual satu kali lewat GitHub UI, **bukan** dikelola Terraform. Isi Variables di masing-masing environment (lihat tabel di bawah) dengan value dari `terraform output` environment yang sesuai + output bootstrap.

5. Push/merge ke branch `staging` → trigger `deploy-staging.yml`, verifikasi OIDC auth, build+push image, `terraform apply` dari CI, dan ECS service jadi healthy.

6. Push tag `v*` atau merge ke `main` → trigger `deploy-prod.yml`, approve manual gate di GitHub UI, verifikasi hal yang sama di production.

### GitHub Environment Variables

Buat dengan key yang sama di environment `staging` dan `production`, isi value berbeda per environment:

| Variable | Isi |
|---|---|
| `AWS_ACCOUNT_ID` | Account ID yang sedang dipakai |
| `AWS_REGION` | `ap-southeast-3` |
| `AWS_ROLE_ARN` | ARN role OIDC (dari `backend-bootstrap` output) |
| `ECR_FRONTEND_URL`, `ECR_BACKEND_URL` | Dari `terraform output` environment tsb |
| `TF_STATE_BUCKET`, `TF_LOCK_TABLE` | Dari `backend-bootstrap` output |
| `GITHUB_ORG`, `GITHUB_REPO_NAME` | Nama org/user & repo GitHub |

Tidak ada AWS secret jangka panjang yang perlu disimpan — OIDC menghilangkan kebutuhan itu sepenuhnya.

## Checklist Migrasi: Akun Personal → Akun Kantor

1. **Akses akun kantor**: siapkan credential admin/SSO untuk akun AWS kantor, pastikan region `ap-southeast-3` sudah aktif di akun tsb (region Jakarta kadang perlu di-opt-in untuk akun lama).
2. **Re-run `backend-bootstrap`** dengan `account_id` baru di `terraform.tfvars`, jalankan `terraform init && apply` **memakai credential admin akun kantor**. Ini membuat state bucket/lock table/OIDC provider/IAM role baru yang sepenuhnya independen dari akun personal — tidak menyentuh resource lama.
3. **Putuskan strategi data**: (a) fresh start — provision environment dari nol di akun baru (paling simpel, cocok jika belum ada data produksi nyata), atau (b) migrasi data — RDS snapshot export/import, sync S3, re-push image ke ECR akun baru. Pilih sesuai kondisi saat migrasi.
4. **Re-run `terraform init -reconfigure` + `apply`** di tiap `environments/<env>` mengarah ke state bucket akun baru (dari output langkah 2), dengan `-var="account_id=<baru>"`. Ini provision VPC/ECS/RDS/ECR/S3 baru di akun kantor.
5. **Update GitHub Environment variables** (staging & production): `AWS_ACCOUNT_ID`, `AWS_ROLE_ARN`, `TF_STATE_BUCKET`, `TF_LOCK_TABLE`, `ECR_FRONTEND_URL`/`ECR_BACKEND_URL` (region biasanya tetap `ap-southeast-3`). **Tidak ada perubahan kode/workflow** — inilah inti dari desain ini.
6. **Cutover DNS** (jika sudah ada domain kustom) mengarah ke ALB DNS name akun baru.
7. **Verifikasi full deploy cycle** di akun kantor (push ke `staging`, lalu tag rilis prod) sebelum mematikan apa pun di akun personal.
8. **Decommission akun personal**: `terraform destroy` tiap environment (staging dulu, baru production), lalu hapus resource `backend-bootstrap` (OIDC provider, IAM role, state bucket — setelah yakin tidak ada yang masih butuh histori state-nya; sebaiknya arsipkan dulu file `.tfstate` terakhir sebelum bucket dihapus).
9. **Cabut/rotate** credential admin lokal akun personal yang dipakai untuk bootstrap.

## Catatan Desain / Trade-off yang Disengaja

- **1 NAT gateway** per environment (bukan per-AZ) — hemat biaya untuk first pass, tapi jadi single point of failure untuk egress private subnet. Tingkatkan ke NAT per-AZ nanti kalau availability jadi prioritas, terutama untuk production.
- **HTTPS opsional**: listener 443/ACM di ALB dikontrol lewat variable `acm_certificate_arn` (default kosong = HTTP saja). Begitu ada domain, isi variable ini — tidak perlu ubah struktur module.
- **CloudFront tidak dibuat** di first pass ini (ALB sudah cukup untuk awal, S3 assets bucket tetap private). Tambahkan CloudFront di depan ALB dan/atau S3 nanti kalau kebutuhan caching/TLS-edge/WAF/akses publik ke asset sudah jelas.
- **`terraform apply` jalan di setiap deploy** (bukan pipeline terpisah untuk "infra" vs "update image"), dengan image tag (commit SHA) sebagai variable yang memicu perubahan task definition. Ini menghindari state drift dari dua jalur deploy yang terpisah; ketika hanya image yang berubah, apply hampir no-op karena cuma 2 resource yang berubah (task definition + service).
- **IAM policy role deploy dipecah dua**: `deploy-app-policy` (ECR/ECS/PassRole, di-scope ketat by ARN) dan `deploy-infra-policy` (permission Terraform yang lebih luas untuk resource seperti EC2/RDS/ELB yang memang tidak mendukung resource-level IAM di banyak action-nya). Ini batas realistis "least privilege" untuk role yang juga menjalankan `terraform apply` dari CI.
- Password database RDS di-generate otomatis (`random_password`) dan disimpan di Secrets Manager — tidak pernah muncul sebagai plaintext di tfvars, state Terraform (yang selalu berisiko), atau GitHub secret.
