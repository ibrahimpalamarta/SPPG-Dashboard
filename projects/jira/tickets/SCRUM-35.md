# SCRUM-35: [DATA-002] Cashflow Upload v1 staging parser
Tahap: 2 | Status: IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-TPLVER) | Terakhir diubah: 2026-10-23 20:00

## Kondisi awal (hasil audit kode)
- Tidak ada parser Cashflow. Pipeline SCRUM-24 menyimpan domain CASHFLOW lewat staging mentah generik.
- Sampel: kontrak resmi ditemukan di Drive, **`MBG_SPPG_Cashflow_Template_1.xlsx`** ("Template Basis Data Arus Kas — Struktur & Aturan Unggah", SPPG Kebonsari **Sukun**). Berkas ini memuat sheet `Kamus_Data` (definisi kolom, tipe, wajib) dan baris nyata Mei 2026. Sesi 22 Okt juga mencatat sampel DNM (`[DNM] CASHFLOW DONOMULYO`) yang tata letaknya berbeda.

## Kontrak (dari Kamus_Data template Sukun)
- `Transaksi_Kas` (18 kolom): txn_id, tanggal, no_bukti, tipe, arah, dana, akun_kas, kategori, uraian, pihak, bank, no_rekening, jumlah, bukti_checklist, link_invoice_pemasok, link_invoice_pembayaran, sumber, status_review
- `Rincian_Belanja` (14 kolom): line_id, txn_id, no_bukti, tanggal, kategori, komponen, supplier, nama_barang, qty, satuan, harga_satuan, jumlah_baris, confidence, catatan_review
- `Insentif_Penggajian` (9 kolom, **data pribadi**): row_id, txn_id, tipe, posisi, nama, no_rekening, bank_atas_nama, periode, nominal
- Header di baris 1 tiap sheet. **Tidak ada sel `template_version`** (B-TPLVER).

## Yang sudah dikerjakan
- [x] `cashflowParser` terdaftar untuk `CASHFLOW` — `backend/src/lib/ingest/cashflow.ts`
- [x] Sheet data dikenali dari **header** (`txn_id`), bukan nama sheet: SKN (2 sheet) dan DNM (1 sheet "Transaksi Kas") lolos tanpa cabang per dapur
- [x] `Insentif_Penggajian` tidak di-staging (D-13), dicatat di ringkasan sheet sebagai `skipped`
- [x] Staging saja: tidak ada total, klasifikasi transfer, normalisasi kategori/currency/tanggal
- [x] Kosong tetap absen/NULL; baris duplikat dan multi-line dipertahankan apa adanya
- [x] `template_version` = NULL (tidak ada di sumber), dicatat untuk SCRUM-130
- [x] Refactor: `stageRows()` + `SheetRule` + `loose()` dipindah ke `staging.ts`; registry menjadi map statis domain → parser (`pipeline.ts`)

## Sisa pekerjaan
- [ ] Staging persisten (B-SCHEMA)
- [ ] Penanda versi template (B-TPLVER → SCRUM-130)
- [ ] Sampel Lawang untuk alias kolom pertama (B-SAMPLE-LWG). Toleransi header sudah ada (`loose`), tapi belum diuji dengan berkas nyata Lawang

## Acceptance criteria
- [x] Jumlah baris staging = jumlah baris data sumber (per sheet data)
- [x] Nilai mentah identik ("Rp65,000", "12,5", tanggal `10`, kosong)

## Test
`src/lib/ingest/cashflow.test.ts` memakai fixture sintetis (header persis template Sukun, nilai karangan, D-08):
- jumlah baris per sheet (Transaksi_Kas 3, Rincian_Belanja 2; sheet dokumentasi/ref 0)
- `Insentif_Penggajian` dilewati dan nama orang tidak muncul di staging
- nilai mentah identik: currency teks, koma desimal, tanggal hanya hari, nilai hilang
- txn duplikat → 2 baris dengan `source_record_id` berbeda
- layout DNM 1 sheet ter-staging
- berkas tanpa sheet `txn_id` → `EMPTY_FILE`

Backend 131/131 lulus, `tsc` bersih.

## Blocker / pertanyaan terbuka
- B-SCHEMA, B-TPLVER, B-SAMPLE-LWG

## Skema
- [PRD] `finance_txn_upload` (nama dataset + traceability §7.2) lewat `StagingRow`
- [USULAN] wadah fisik → `schema-proposals/SCRUM-24.md`

## Update 2026-10-25 — baseline Sukun (`feature/tahap2-upload-parsers`)
- Baseline asli `CASHFLOW_SUKUN` sheet `Transaksi_Kas` berlayout **flat** (17 kolom, sama dengan layout DNM K-05): `id, txn_id, tanggal, tipe, arah, kategori, uraian, nama_barang, nama_penerima, qty, satuan, harga_satuan, jumlah_baris, total, confidence, status_review, catatan_review`. Satu baris per item; `total` diulang di tiap baris transaksi.
- Fixture anonim `backend/src/lib/ingest/fixtures/sukun-cashflow.csv` (38 baris, nama orang/supplier diganti, B-FIXTURE-PII). Berkas asli tidak di-commit.
- Test baru: semua baris non-kosong ter-staging termasuk 3 baris tanpa `txn_id`; total berulang dipertahankan per baris.
