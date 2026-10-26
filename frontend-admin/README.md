# SPPG Dashboard — Frontend Admin

Next.js 16 (App Router) + TypeScript + Tailwind 4. Backoffice + Dashboard Internal
di belakang login internal (SCRUM-21; mekanismenya di `backend/docs/AUTH.md`).

- `proxy.ts` (Next 16: pengganti middleware) mengirim siapa pun tanpa cookie sesi
  ke `/login`. Cookie `sppg_session` (httpOnly) hanya memegang token sesi dari
  backend; sesi yang sudah mati ditolak backend di request API pertama dan
  diarahkan ke `/sesi-berakhir`. Browser tidak pernah memanggil backend langsung —
  semua lewat server (`lib/api.ts`, server action).
- `lib/nav.ts` = tujuh halaman PRD §5 + permission tiap halaman. Daftar ini dipakai
  sidebar (menu disembunyikan) **dan** `requirePage()` (deep-link → 403).
- `lib/me.ts` memanggil `GET /api/me` dengan token sesi. Backend tetap
  memeriksa permission + scope dapur di setiap request; frontend hanya menggambar.
- Halaman tanpa fitur menampilkan `EmptyState` ("belum tersedia"), tidak pernah angka palsu.

Halaman auth: `/login` (+ langkah MFA), `/reset-password/<token>` (set/reset
password dari link admin), `/keamanan` (ubah password, MFA, sesi aktif), serta
administrasi `/anggota` dan `/peran` yang menu-nya hanya muncul untuk izin
`users:read` / `settings:manage`.

Variabel lingkungan: lihat `.env.example` (salin ke `.env.local`) — hanya
`API_BASE_URL`.

---

## Jalan lokal

```bash
npm ci
npm run dev     # http://localhost:3000/admin  <- perhatikan prefix-nya
```

App ini memakai `basePath: "/admin"`, jadi root (`/`) memang 404 — termasuk di
lokal. Itu perilaku yang benar, bukan bug.

`npm run build` sekaligus jadi type-check (`next build` menjalankan tsc). Lint:
`npm run lint`, kode mati: `npm run knip`. Belum ada test runner.

## Docker

Image-nya multi-stage dan memakai `output: "standalone"`, jadi stage runtime
tidak menjalankan `npm ci` sama sekali — `standalone/` sudah membawa
`node_modules` minimalnya sendiri. `.next/static` tidak ikut ke dalam
`standalone/`, makanya di-copy terpisah.

```bash
docker build -t sppg-fe-admin .
docker run --rm -p 3000:3000 sppg-fe-admin
curl -i localhost:3000/admin     # 200
curl -i localhost:3000/          # 404 — konfirmasi basePath aktif
```

`HOSTNAME=0.0.0.0` di Dockerfile bukan hiasan: server standalone Next default-nya
bind ke localhost, dan ALB tidak bisa menjangkaunya dari luar network namespace
task.

## `basePath` ↔ listener rule ALB

**Dua tempat ini harus diubah bersamaan.** `basePath: "/admin"` di
`next.config.ts` berpasangan dengan `aws_lb_listener_rule.admin_http`
(priority 20, `path_pattern = ["/admin", "/admin/*"]`) di
`infra/modules/compute/main.tf`.

Alasannya: satu ALB dipakai bertiga, dan selama belum ada domain/sertifikat ACM
tidak ada hostname untuk dirouting — pembagiannya terpaksa lewat path.

| Path | Tujuan | Priority |
|---|---|---|
| `/health` | backend | 5 |
| `/api/*` | backend | 10 |
| `/admin`, `/admin/*` | **frontend-admin** | 20 |
| sisanya | frontend-public | default |

`basePath` membuat Next memancarkan seluruh URL aset di bawah `/admin`
(`/admin/_next/...`), sehingga aset ikut tertangkap rule yang sama. Tanpa itu
aset akan jatuh ke default action dan 404 di frontend-public. Health check target
group menembak `/admin` langsung ke container — health check ALB tidak lewat
listener rule, jadi path-nya harus mengandung prefix.

Begitu domain dan `acm_certificate_arn` tersedia, routing ini bisa pindah ke
host-based (`admin-staging.<domain>`) dan `basePath` dilepas — keduanya sekaligus.

## Deploy

Tidak ada workflow terpisah untuk app ini. Push ke branch `staging` memicu
`.github/workflows/deploy-staging.yml`, yang membangun ketiga image (backend,
frontend-admin, frontend-public) dengan tag `github.sha` yang sama lalu
menjalankan satu `terraform apply`. Satu apply memegang semua image tag
sekaligus — itu sebabnya tidak dipecah per app: apply terpisah akan saling
menimpa tag milik service lain kembali ke `latest`.

Detail environment, IAM, dan alur branch ada di [`infra/README.md`](../infra/README.md).
