# Database SPPG Dashboard

Schema PostgreSQL hasil terjemahan `sppg_erd.drawio` (15 entitas), lengkap dengan
constraint, index, seed referensi, dan dua view publik untuk SCRUM-13.

## Struktur

```
backend/
  prisma/
    schema.prisma          sumber kebenaran model (Prisma -> PostgreSQL)
    migrations/
      20260811000000_init_auth/            users, audit_logs, enum Role
      20260813000000_add_operational_domain/  model lama (PRD 10)
      20260818000000_reshape_to_erd/       <- membentuk ulang ke ERD
    README.md              berkas ini
  scripts/
    seed-superadmin.ts     satu akun Super Admin (butuh Auth0 M2M)
    seed-reference-data.ts 6 dapur + 12 target AKG
```

Prompt tugas meminta folder `migrations/`, `seed/`, dan `README.md` terpisah.
Ketiganya diwujudkan di dalam struktur Prisma yang sudah ada, bukan sebagai
folder baru di root, karena repo ini sudah menjalankan `prisma migrate deploy`
lewat ECS migrate task di `.github/workflows/deploy-staging.yml` dan
`deploy-prod.yml`. Folder SQL terpisah berarti dua sistem migrasi menguasai satu
database, dan `prisma migrate` akan menganggap tabel-tabel itu drift lalu
menawarkan drop.

### Kenapa Prisma

Dependency paling minim: Prisma sudah terpasang, sudah terhubung ke CI/CD, dan
sudah dipakai untuk dua migration sebelumnya. Menambah `node-pg-migrate` berarti
dependency baru untuk pekerjaan yang sudah ada alatnya.

DDL dihasilkan lewat `prisma migrate diff`, lalu **disunting tangan** untuk hal
yang tidak bisa dinyatakan di schema Prisma: seluruh `CHECK` constraint,
`COMMENT ON`, kedua `VIEW`, dan backfill kolom `audit_logs.entity`. Bagian tulis
tangan diberi penanda di dalam `migration.sql`.

## Cara menjalankan

```bash
cd backend
npm install

# terapkan seluruh migration (dari database kosong sekalipun)
npm run migrate:deploy

# isi data referensi: 6 dapur + 12 target AKG. Idempotent, aman diulang.
npm run seed:reference

# opsional: satu akun Super Admin (butuh kredensial Auth0 M2M di .env)
npm run seed:superadmin
```

Untuk mengembangkan schema lebih lanjut: `npm run migrate:dev`.

## Keputusan desain

| Topik | Keputusan | Alasan |
|---|---|---|
| PK | `BIGSERIAL` untuk ID internal | Sesuai ERD (`PK, INT`) |
| ID publik | `public_id UUID` terpisah pada entitas yang tampil ke publik | ID berurutan tidak bocor dan tidak bisa dienumerasi dari situs publik |
| Nama tabel | plural (`kitchens`, bukan `KITCHEN`) | Mengikuti `users`/`audit_logs`/`gallery_images` yang sudah ada |
| Nilai enum | SCREAMING_SNAKE (`DITERIMA`) | Mengikuti enum `Role` yang sudah ada; ERD menulisnya huruf kecil |
| Angka | `NUMERIC`, tidak pernah `FLOAT` | Nilai gizi dan rupiah diagregasi `SUM`/`AVG` di dashboard; galat float akan menumpuk |
| Enum vs CHECK | native PG enum | Sudah jadi pola repo; lebih ketat daripada CHECK atas teks |

Presisi: uang `NUMERIC(14,2)`, gizi `NUMERIC(10,2)`, persen `NUMERIC(5,2)`,
`kebutuhan_bahan_kg` `NUMERIC(12,3)`, koordinat `NUMERIC(9,6)`.

Aturan format angka SOP-OPR-001 — titik sebagai pemisah desimal (`0.5`), koma
hanya untuk tampilan rupiah (`Rp 25,000`), non-rupiah tanpa pemisah ribuan
(`1250`) — adalah urusan parser importer dan formatter frontend. `NUMERIC`
menyimpan nilai, bukan format, jadi tidak ada yang perlu ditegakkan di DDL.

### Yang berubah dari model lama

Dibuang: `menus`, `nutritions`, `transactions`, `documents`, `geographic_infos`.
Dibentuk ulang: `users`, `audit_logs`, `kitchens`, `gallery_images`.

`users.auth0_sub` dipertahankan sehingga tautan ke Auth0 tetap utuh walau
`users.id` berpindah dari UUID ke BIGSERIAL dan ternomori ulang. `users.scope_id`
yang dulu UUID tanpa constraint kini FK sungguhan ke `kitchens` — menutup TODO
yang sudah ada di schema sebelumnya (scoping DATA_ADMIN per dapur, SCRUM-1).

Baris `audit_logs` lama tetap disimpan (audit bersifat append-only): `entity`
di-backfill dari `entity_type` sebelum kolom lama dibuang. Tapi `actor_id` dan
`entity_id` lama berisi UUID yang tidak bisa dipetakan ke BIGINT, karena PK
`users` ikut berganti tipe di migration yang sama — baris audit lama kehilangan
tautan pelaku dan tautan entitasnya.

## Mapping tabel ke tiket Jira

Diverifikasi langsung ke Jira (project SCRUM, "MBG Dashboard"), bukan disalin
dari prompt.

| Tabel / view | Tiket | Acceptance criteria yang didukung |
|---|---|---|
| `users`, `audit_logs` | **SCRUM-1** Authentication - Login RBAC | 5 role; `audit_logs` menopang "history (jejak audit)" |
| `menu_plans` | **SCRUM-2** Implement excel template tables to database | Satu baris per bahan; kolom template sama untuk tiap SPPG, isi berbeda |
| `upload_batches` | **SCRUM-5** Upload Menu/Master File | `status` diterima/ditolak/processing; `notes` menampung alasan penolakan |
| `upload_batches.file_hash` | **SCRUM-6** Import to Database | UNIQUE — "re-import berkas yang sama diperlakukan sama bila tidak ada perubahan" |
| `upload_batches` | **SCRUM-7** Upload History | Punya date, uploader, kitchen, row count, status; index `(kitchen_id, upload_date)` untuk sort by date |
| `akg_targets`, `akg_compliances` | **SCRUM-8** Load AKG reference and compute compliance | 12 kelompok sasaran; `status` within/below/above |
| `daily_kitchens`, `public_summaries` | **SCRUM-11** Program Summary KPI | meals, kitchens, coverage; `last_refreshed_at` untuk "shows last-refreshed time" |
| `menu_nutritions`, `akg_compliances` | **SCRUM-12** Nutrition Dashboard | Gizi per portion class per kitchen; tren lintas tanggal via index `(kitchen_id, tanggal)` |
| `public_menu_nutrition_view`, `public_kitchen_coverage_view` | **SCRUM-13** Data Separation Guarantee | "Public site reads only public marts"; "enforced at data layer, not UI" |
| `cms_announcements`, `cms_documents` | **SCRUM-14** CMS Admin | draft/published; title + category; seluruh aksi tercatat di `audit_logs` |
| `kitchens` | **SCRUM-15** Kitchen Master | 6 dapur; name, region, type, status, lat/lng |
| `ingredients`, `recipe_costings`, `menu_costs` | pendukung | Master bahan kanonik dan biaya; `menu_costs` internal-only |

Epic terkait tanpa tabel langsung: SCRUM-3 (Authentication), SCRUM-4 (Data
management), SCRUM-9 (Internal Dashboard), SCRUM-10 (External Dashboard).

## Pemisahan data publik vs internal (SCRUM-13)

Tidak ada tabel permission baru. Pemisahan diwujudkan sebagai dua view yang
hanya memilih kolom non-sensitif:

- `public_menu_nutrition_view` — gizi per dapur/tanggal/kelompok porsi
- `public_kitchen_coverage_view` — sebaran dapur + angka ringkas periode terakhir

Yang **tidak pernah** masuk view: seluruh isi `menu_costs` (ditandai
`[mart, internal-only]` di ERD), `menu_plans.harga_bahan`, `menu_plans.total_harga`,
seluruh `recipe_costings`, `daily_kitchens.jumlah_pm` (hitungan penerima manfaat
eksak), dan `users` (PII + `auth0_sub`).

Sejak migrasi `20260819000000_public_db_role`, siapa yang boleh membaca juga
ditegakkan di database: role `sppg_public` hanya punya `GRANT SELECT` ke dua
view di atas, `public_summaries`, dan tiga tabel CMS. Karena view berjalan
dengan hak pemiliknya (bukan `security_invoker`), role itu bisa membacanya tanpa
punya akses apa pun ke `menu_plans`, `daily_kitchens`, atau `menu_costs`.

Row-level security tidak dipakai. Yang masih di aplikasi: filter
`status = PUBLISHED` untuk konten CMS — role publik bisa melihat draft.

## Open Questions

Semua poin di bawah juga ditandai `TODO(catatan):` di `schema.prisma` dan/atau
`migration.sql`. Tidak ada yang diputuskan sepihak.

1. **`akg_targets.serat_min` / `serat_max` kosong.** SCRUM-8 dan SCRUM-12 meminta
   kolom Serat, tapi tabel rujukan resmi (Tabel 2 SOP-OPR-001 / Juknis 401.1
   Tahun 2025) hanya memuat Energi, Protein, Lemak, dan Karbohidrat — tidak ada
   rentang Serat sama sekali. Kolomnya dibuat nullable dan dibiarkan NULL.
   **Perlu konfirmasi Program Team** sebelum compliance Serat boleh dihitung.

2. ~~**SCRUM-13 baru setengah jalan.**~~ **Selesai.** Role `sppg_public` +
   `GRANT SELECT` terbatas ada di migrasi `20260819000000_public_db_role`;
   `/api/public/*` memakainya lewat `publicDb`. Sisa yang masih di aplikasi
   hanya filter `status = PUBLISHED` untuk konten CMS.

3. **`menu_plans.ingredient_id` belum punya aturan pengisian.** `bahan` adalah
   teks bebas yang ditulis ahli gizi per dapur, sedangkan `ingredient_id`
   merujuk master kanonik. Proses matching-nya — termasuk peran kolom
   `ingredients.aliases` — belum didefinisikan, jadi `ingredient_id` dibiarkan
   nullable. Peringatan dari dokumen rujukan: "Ubi Ungu" dan "Kubis ungu" adalah
   bahan **berbeda** dan tidak boleh digabung otomatis berdasarkan kemiripan.

4. **Pemetaan 4 `portion_class` ke 12 kelompok sasaran AKG belum ada.**
   `menu_plans` memakai Kecil/Besar/Balita/Busui&Bumil, sedangkan target AKG
   dipecah per jenjang sekolah dan waktu makan. `akg_compliances` tidak bisa
   diisi sampai pemetaan ini diputuskan.

5. **Wilayah, jenis, dan koordinat 6 dapur kosong.** Master dapur belum ada
   sebagai berkas. Kolomnya dibuat nullable dan sengaja tidak ditebak.

6. **`password_hash` tidak dibuat** meski ada di ERD — bertentangan dengan
   arsitektur Auth0 yang sudah berjalan, dan tidak ada jalur kode yang
   menulisnya. Perlu konfirmasi agar ERD diperbarui.

7. **`gallery_images` dipertahankan** walau tidak ada di ERD, karena fitur galeri
   CMS sudah terpasang. Konfirmasi apakah memang harus dihapus.

8. **Mekanisme refresh mart belum ditentukan.** Kelima tabel mart adalah tabel
   fisik pre-computed; job terjadwal vs trigger vs recompute saat import
   di-commit belum diputuskan. Migration ini hanya membuat strukturnya.

9. **`menu_plans.hari` mungkin redundan** — bisa diturunkan dari `tanggal`.
   Dipertahankan karena ada di ERD dan di form SOP.

10. **`berat_kotor` belum punya konvensi tetap.** Sebagian baris sumber punya
    `berat_kotor = berat_bersih`, sebagian lagi `= berat_bersih / BDD`. Sampai
    satu konvensi dipilih, setiap perhitungan kebutuhan bahan meleset sebesar
    faktor susut.

11. **Urutan CMS_ADMIN vs DATA_ADMIN.** Keduanya sumbu berbeda, bukan tingkatan;
    CMS_ADMIN ditaruh di bawah DATA_ADMIN hanya agar penggabungan klaim ganda
    deterministik (`src/auth/roles.ts`).

## Verifikasi yang sudah dijalankan

Dari database kosong:

```
migrate deploy   3 migration terpasang, tanpa error urutan FK
skema            16 base table (15 entitas ERD + gallery_images), 2 view
constraint       22 CHECK, 17 foreign key
seed:reference   kitchens: 6, akg_targets: 12 — dijalankan dua kali, angka tetap
view             keduanya resolve; pemindaian kolom membuktikan tidak ada
                 kolom harga/biaya/jumlah_pm/PII yang bocor ke view publik
build + test     tsc bersih, 41/41 test lolos
```
