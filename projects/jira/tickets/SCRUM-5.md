# SCRUM-5: Halaman Upload Data
Tahap: 2 | Status: IN_PROGRESS (sebagian BLOCKED: B-AUTH0-FE, B-SCHEMA) | Terakhir diubah: 2026-10-23 18:30

## Kondisi awal (hasil audit kode)
- Backend: `POST /api/upload-batches` lengkap (kitchen, domain, period, file; duplikat → warning).
- Frontend: halaman mockup dengan data palsu, tanpa pemanggilan API.

## Yang sudah dikerjakan
- [x] Form: dapur (hanya dalam scope, default = pilihan header), jenis data (7 domain), periode `<input type="month">` opsional, file `.xlsx` — `app/(app)/unggah-data/upload-form.tsx`
- [x] Nama + ukuran berkas; "Profil terdeteksi: Belum terdeteksi" (slot untuk SCRUM-39)
- [x] Server Action `uploadFile` meneruskan multipart ke backend dengan token sesi (browser tidak memegang token API) — `actions.ts`
- [x] Hasil: badge status (FR-UP-05), batch ID, jumlah baris, ringkasan sheet, pesan backend (PRD §9), peringatan duplikat; tautan ke Mapping & Validasi
- [x] Error: 403 → "Anda tidak memiliki akses…", 400 → pesan field dari backend, lainnya → pesan umum
- [x] Role tanpa `upload:create` (INTERNAL) melihat "Hanya lihat"; akun tanpa dapur melihat "Belum ada dapur"
- [x] Batas body Server Action dan proxy 11 MB (backend tetap penegak 10 MB) — `next.config.ts`
- [x] Label domain/status dan `StatusBadge` bersama — `lib/upload.tsx` (dipakai lagi di SCRUM-25)

## Sisa pekerjaan
- [ ] Tautan ke detail batch di history: menunggu SCRUM-25
- [ ] Status real-time/polling: tidak diperlukan sekarang karena upload sinkron dan status final ada di respons. Ditambah bila pipeline dipindah ke queue (lihat SCRUM-24).
- [ ] Login nyata (B-AUTH0-FE)
- [ ] Tombol Download Template: SCRUM-125

## Acceptance criteria
- [x] AC-UP-01: pilih kitchen/domain + file valid → batch ID, nama file, uploader, waktu, kitchen, domain, status (backend SCRUM-22/24; UI menampilkan batch + status)
- [x] FR-UP-01: kitchen scope mengikuti role (dropdown dari `/api/me.kitchens`, backend menolak di luar scope)
- [x] FR-UP-05: status tampil sebagai badge

## Test
Diverifikasi pada build produksi dengan sesi lokal + stub backend:
- `GET /admin/unggah-data` → 200, form tampil ("Periode (opsional)", "Belum terdeteksi").
- Server Action dipanggil lewat HTTP dengan encoding React asli: backend menerima `Authorization: Bearer <token sesi>` dan multipart 300 KB; action mengembalikan `ok: true`, status `NEEDS_MAPPING_UPDATE`, sheets, dan warning duplikat.
- Catatan: saat debugging sempat ditambah `console.error` sementara di `actions.ts`; sudah dihapus sebelum commit.
- lint / knip / build bersih.

## Blocker / pertanyaan terbuka
- B-AUTH0-FE, B-UPLOADER (OD-07)

## Skema
- Tidak ada baru.
