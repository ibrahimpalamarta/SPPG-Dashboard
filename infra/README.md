# Infrastruktur GCP — SPPG Dashboard

Terraform + GitHub Actions untuk 2 environment (`staging`, `production`) di **satu project GCP**, region `asia-southeast2` (Jakarta). Pindahan dari AWS (ECS/RDS/S3/SES, lihat git history sebelum commit migrasi ini).

Branch `develop` **bukan** environment: hanya branch transisi (kena CI gate, tidak pernah di-deploy).

## Struktur

```
infra/
├── bootstrap/        # one-time, manual: API, state bucket, Workload Identity, service account
├── modules/app/      # semua resource satu environment
├── staging/          # root module: module app + sizing staging
└── production/       # root module: module app + sizing production
```

## Arsitektur per environment

| Komponen | GCP | Catatan |
|---|---|---|
| backend, frontend-admin, frontend-public | Cloud Run (3 service) | HTTPS bawaan di `*.run.app`, scale ke 0 saat tidak dipakai |
| Migrasi + seed | Cloud Run Job `…-migrate` | Image backend yang sama, dijalankan CI sebelum revisi baru melayani traffic |
| Database | Cloud SQL Postgres 16 | Public IP **tanpa** authorized network: satu-satunya jalan masuk adalah Cloud SQL connector (`/cloudsql` socket) dengan IAM |
| Upload | GCS bucket `<project>-sppg-dashboard-<env>-assets` | Uniform access, public access prevention |
| Secret | Secret Manager | `DATABASE_URL`, `MFA_ENCRYPTION_KEY` (dibuat Terraform), `SMTP_URL`, `AI_API_KEY`, `DATABASE_URL_PUBLIC` (opsional, dari GitHub secret) |
| Image | Artifact Registry `sppg-dashboard-<env>` | Simpan 10 terbaru, sisanya dihapus setelah 30 hari |
| Off-hours (staging) | Cloud Scheduler → SQL Admin API | Cloud SQL stop 21:00, start 07:50 WIB Senin–Jumat |
| AI | Gemini (Vertex AI express mode) | Kunci API, bukan IAM; dipanggil dari backend dan qa-audit |
| Email | SMTP (nodemailer) | GCP tidak punya layanan email; pakai Gmail app password, Brevo, SendGrid, dll. |

**Tidak ada load balancer.** Tiap service punya URL sendiri: `https://sppg-dashboard-<env>-<service>-<project number>.asia-southeast2.run.app`. Ini aman karena frontend-admin memanggil API dari server-nya (`API_BASE_URL`), tidak pernah dari browser, jadi tidak butuh CORS. `basePath: "/admin"` di frontend-admin dipertahankan, jadi URL admin berakhiran `/admin`. Begitu ada domain, pasang [domain mapping Cloud Run](https://cloud.google.com/run/docs/mapping-custom-domains) atau HTTPS Load Balancer; module tidak perlu dirombak.

## Provisioning pertama kali

Prasyarat: `gcloud` dan Terraform ≥ 1.6, akun dengan role **Owner** di project.

1. **Login dan bootstrap** (satu kali; state disimpan lokal di `infra/bootstrap/terraform.tfstate`, simpan file itu baik-baik):
   ```bash
   gcloud auth application-default login
   cd infra/bootstrap
   cp terraform.tfvars.example terraform.tfvars   # isi project_id (ID string, bukan projects/<nomor>)
   terraform init
   terraform apply
   terraform output
   ```

2. **GitHub Environments** (`staging` dan `production`). Isi lewat Settings → Environments:

   | Nama | Jenis | Nilai |
   |---|---|---|
   | `GCP_PROJECT_ID` | variable | ID project |
   | `GCP_REGION` | variable | `asia-southeast2` |
   | `GCP_WIF_PROVIDER` | variable | output `wif_provider` |
   | `GCP_DEPLOY_SA` | variable | output `deploy_service_accounts[<env>]` |
   | `TF_STATE_BUCKET` | variable | output `tf_state_bucket` |
   | `AI_API_KEY` | secret | Kunci Gemini (`AQ.…`). Kosong = cek AI upload dilewati |
   | `SMTP_URL` | secret | mis. `smtps://user%40gmail.com:app-password@smtp.gmail.com:465`. Kosong = email tidak dikirim |
   | `DATABASE_URL_PUBLIC` | secret | **production saja, wajib**: `postgresql://sppg_public:<pw>@localhost/sppg_dashboard?host=/cloudsql/<connection name>` (role dari `npm run grant:public-role`) |

   Variable/secret AWS lama (`AWS_ROLE_ARN`, `AWS_REGION`, `TF_LOCK_TABLE`) boleh dihapus. Dua aturan manual, **bukan** Terraform:
   - **Deployment branches**: `staging` → branch `staging`; `production` → `main` + tag `v*`. Workload Identity hanya mengunci repo + nama environment, jadi aturan branch ini yang menegakkannya.
   - **Required reviewers** pada `production`: gate approval manual.

3. **Deploy pertama**: push/merge ke `staging`. Workflow membuat Artifact Registry, push image, membuat Cloud SQL (pertama kali ±10 menit), menjalankan migrasi, lalu semua service. Jangan `terraform apply` penuh dari laptop sebelum image ada: Cloud Run menolak image yang belum di-push.

4. **Super Admin pertama**: jalankan `seed:superadmin` sekali lewat job migrate dengan command override, atau lewat [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) dari laptop (`npm run seed:superadmin` dengan `DATABASE_URL` ke proxy).

## Alur deploy (`deploy-staging.yml` / `deploy-prod.yml`)

1. Test + build backend (gate).
2. Auth ke GCP lewat Workload Identity (tanpa kunci JSON).
3. `terraform apply -target` Artifact Registry → build + push image (tag = commit SHA). Frontend di-build sebelum migrasi, jadi frontend yang gagal compile menggagalkan job sebelum database disentuh.
4. `terraform apply -target` job migrate (menarik Cloud SQL, secret, bucket pada environment baru).
5. Staging: bangunkan Cloud SQL bila sedang stop.
6. `gcloud run jobs execute … --wait`: migrasi + seed.
7. `terraform apply` penuh. Apply Cloud Run menunggu revisi baru siap, jadi container yang crash menggagalkan step ini.

Production belum membangun image frontend (`enable_frontends = false` di `production/main.tf`).

## Mematikan AWS lama

Kode Terraform AWS sudah dihapus dari branch ini, tapi state lokalnya masih ada di `infra/backend-bootstrap/` dan `infra/environments/*/` (untracked). Setelah GCP jalan:

```bash
git worktree add ../sppg-aws 424b84c          # commit terakhir sebelum migrasi
cp -r infra/environments/staging/{terraform.tfvars,backend-staging.hcl} ../sppg-aws/infra/environments/staging/
cd ../sppg-aws/infra/environments/staging
terraform init -backend-config=backend-staging.hcl && terraform destroy
# ulangi untuk production, lalu backend-bootstrap (salin terraform.tfstate-nya)
```

Hapus folder lama itu sesudahnya.

## Trade-off yang disengaja

- **Satu project untuk dua environment.** Role deployer berlaku se-project, jadi deployer staging secara teknis bisa menyentuh production. Untuk isolasi penuh, buat project kedua dan apply bootstrap di sana; module tidak berubah.
- **Secret ada di Terraform state** (password DB, kunci MFA, dan secret dari GitHub). State bucket private + versioning; akses = akses ke project.
- **`TRUST_PROXY_HOPS=2`**: client → Google Front End → frontend-admin → Google Front End → API. Bila limiter login per-IP terlihat menggabungkan semua user, cek header `X-Forwarded-For` di log backend.
- **Cloud SQL staging `db-f1-micro`** (shared core, tanpa SLA) dan stop di luar jam kerja. Production `db-custom-1-3840` REGIONAL (HA) + point-in-time recovery.
