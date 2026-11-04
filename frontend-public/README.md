# SPPG Dashboard — Frontend Public (Fase 0: Coming Soon)

Next.js (App Router) + TypeScript. Nantinya jadi dashboard transparansi publik
program Makan Bergizi Gratis (MBG) — tanpa auth, dioptimalkan untuk page load
cepat dan refresh data berkala (ISR).

Fase ini **hanya** fondasi deployment: satu halaman statis "Segera Hadir", tanpa
data fetching, tanpa auth, tanpa design system. Desain UI/UX masih berjalan.
Yang sudah jadi dan tidak perlu disentuh lagi saat membangun halaman: struktur
folder, Docker build, provisioning Terraform, dan pipeline CI/CD ke staging.

---

## Jalan lokal

```bash
npm ci
npm run dev     # http://localhost:3000
```

`npm run build` sekaligus jadi type-check (`next build` menjalankan tsc), sama
seperti backend. Belum ada linter maupun test — repo ini belum punya keduanya.

## Docker

Image-nya multi-stage dan memakai `output: "standalone"`, jadi stage runtime
tidak menjalankan `npm ci` sama sekali — `standalone/` sudah membawa
`node_modules` minimalnya sendiri. `.next/static` tidak ikut ke dalam
`standalone/`, makanya di-copy terpisah.

```bash
docker build -t sppg-fe-public .
docker run --rm -p 3000:3000 sppg-fe-public
curl -i localhost:3000/          # 200
```

`HOSTNAME=0.0.0.0` di Dockerfile bukan hiasan: server standalone Next default-nya
bind ke localhost, dan Cloud Run tidak bisa menjangkaunya dari luar container.

## Routing

App ini punya Cloud Run service dan URL `*.run.app` sendiri (lihat
`terraform output urls` di `infra/<env>`), jadi semua path miliknya. Begitu
dashboard publik mulai memanggil `/api/public/*`, panggil dari server
(seperti frontend-admin) atau isi `CORS_ORIGINS` backend dengan URL app ini.

## Deploy

Tidak ada workflow terpisah untuk app ini. Push ke branch `staging` memicu
`.github/workflows/deploy-staging.yml`, yang membangun ketiga image (backend,
frontend-admin, frontend-public) dengan tag `github.sha` yang sama lalu
menjalankan satu `terraform apply`. Satu apply memegang semua image tag
sekaligus — itu sebabnya tidak dipecah per app: apply terpisah akan saling
menimpa tag milik service lain kembali ke `latest`.

Detail environment, IAM, dan alur branch ada di [`infra/README.md`](../infra/README.md).
