# TASKLIST — semua tiket Maulana, urut flow

Disusun: 2026-10-25. Berisi **semua 104 tiket** Jira SCRUM milik Maulana Ibrahim
(ditambah SCRUM-22 yang tanpa assignee). Tiket digabung jadi 30 task (T01–T30) dan
dikelompokkan ke 9 tahap. Isinya bisa dibaca dua cara:

- **Ringkasan**: satu baris per task (tabel pertama).
- **Rincian**: satu baris per tiket, lengkap dengan urutan kerja dan cara mengujinya.

Aturan:
- **Urutan kerja** = nomor `Txx.y`. Kerjakan dari atas ke bawah, kecuali kolom
  *Butuh* menyebut task lain yang sudah selesai.
- **Status kode** diambil dari `projects/jira/STATUS.md` (audit kode, legenda ada di `projects/jira/README.md`).
  Status Jira tidak dipakai, karena hampir semua tiket "In Progress" meski belum ada kodenya.
  Blocker `B-*` dijelaskan di `projects/jira/blockers.md`.
- **Duplikat** (SCRUM-126, 127, 128) tidak dikerjakan. Tutup bersama tiket aslinya.
- Jira tidak diubah oleh dokumen ini. Dasar pengelompokan ada di bagian paling bawah file ini.
- Saat status tiket berubah, perbarui `projects/jira/STATUS.md` + `projects/jira/tickets/<fitur>/<subfitur>/SCRUM-xx.md` dulu, lalu
  kolom status di sini.

## Cara uji (kolom "Uji")

| Kode | Arti | Cara jalan |
|---|---|---|
| `U` | Test otomatis backend (`node:test`) | `cd backend && npm test`. **File test baru wajib ditambah ke script `test` di `backend/package.json`**, karena daftarnya eksplisit |
| `UI` | Cek manual di frontend-admin (lokal/staging), per role | Login sebagai SUPER_ADMIN (PM MBG), lalu DATA_ADMIN (Data Operasional). frontend-admin belum punya test otomatis, hanya `npm run lint` |
| `D` | Rekonsiliasi data: hasil dibandingkan dengan sampel/sumber | Pakai fixture sintetis (D-08) atau pilot data pack T29 |

Setiap tiket dianggap selesai bila semua poin di kolom *Selesai bila* lulus, dan
`npm test` + `tsc` (backend) serta `npm run lint` (frontend) bersih.

---

## Ringkasan 30 task

| # | Task | Tiket Jira | Status kode |
|---|---|---|---|
| **Tahap 1 — Akses & Shell** ||||
| T01 | RBAC + auth internal (argon2id, sesi, MFA) | 20 | IN REVIEW · merged #29 (B-ROLE) |
| T02 | App shell, navigasi, tampilan bersih/PM-only reference | 21, 123 | IN REVIEW · merged #33, #32 (B-DOCS, B-PLAN) |
| T03 | Undang anggota + aktivasi akun dari link | 121, 122 | IN REVIEW · merged #31 (B-EMAIL) |
| T04 | Dapur reference & rollout-status metadata | 132 | IN REVIEW · kode di develop (B-SCHEMA, B-LWG, B-TUREN) |
| **Tahap 2 — Upload** ||||
| T05 | Upload batch & metadata umum | 22, 37 | IN_PROGRESS (B-SCHEMA, B-ASSIGN) |
| T06 | Excel pipeline + halaman Unggah Data + history/status | 24, 5, 25 | IN_PROGRESS |
| T07 | Cashflow Upload v1 staging parser | 35 | IN_PROGRESS (B-SCHEMA, B-TPLVER) |
| T08 | Menu Upload v1 staging parser | 36 | IN_PROGRESS (B-SCHEMA) |
| T09 | Input Maker Upload v1 + Sukun raw staging | 86, 118 (126 duplikat) | IN REVIEW |
| T10 | Template resmi: generate, tombol download, tolak header-only | 130, 125, 131 | IN REVIEW |
| **Tahap 3 — Mapping** ||||
| T11 | Mapping Profile Registry + detect/apply per dapur | 26, 39 | IN_PROGRESS (B-REG default dipakai, B-DD) |
| T12 | Schema mismatch handling + layar kolom berbeda | 94, 124 | IN_PROGRESS (B-SCHEMA) |
| T13 | Sukun Cashflow profile/adapter | 27, 55 | IN REVIEW (B-DD) |
| T14 | Lawang + persiapan DNM/PCK/SML Cashflow | 32, 56, 57 | IN REVIEW (B-SAMPLE-LWG/OTHER) |
| T15 | Menu common adapter + menu_recipe_line + profil 5 dapur | 31, 73, 58 | IN_PROGRESS (31/73 siap review; T15.3 B-SAMPLE-LWG/OTHER) |
| **Tahap 4 — Kanonik Finance** ||||
| T16 | finance_transaction header/line + anti-double-count | 77, 40, 98, 41 | IN REVIEW |
| T17 | Rantai RAB → PO → GR → Payment (Sukun) | 44, 28, 45, 29, 46, 47, 30 | BLOCKED (B-SRC-SKN) (B-RAW) |
| T18 | Dataset finance_balance + beneficiary_daily_count + PII | 49, 50, 72 | BLOCKED (B-SRC-SKN) |
| **Tahap 5 — Validasi & Publish** ||||
| T19 | Normalisasi bersama (tanggal/mata uang/unit) + missing ≠ 0 | 52, 53 | IN_PROGRESS (siap review) |
| T20 | Validation framework + severity & quarantine | 33, 51 | IN_PROGRESS (siap review) |
| T21 | Finance DQ: kategori, transfer internal, SLA D0/D+1, rekonsiliasi Ringkasan_Transaksi | 34, 42, 43, 48, 84, 119 (127 duplikat) | IN_PROGRESS (siap review) |
| T22 | Menu DQ lintas template dapur | 85, 120 (128 duplikat) | IN_PROGRESS (Sukun siap review) |
| T23 | Review/approval PM, eligibility, publish idempoten, supersede | 117, 54, 78, 95, 96 | IN_PROGRESS (siap review; B-ROLE) |
| **Tahap 6 — KPI & Dashboard** ||||
| T24 | Widget Finance: Top 5 Supplier, Expense Mix, Planned Cost/Portion, Saldo, EFI Transfer | 62, 97, 63, 99, 64, 100, 65, 101, 66, 102 | BLOCKED (B-SRC-SKN) |
| T25 | Widget Menu/Gizi/Beneficiary + validasi total tersalurkan | 74, 115, 76, 116, 103, 129 | TODO |
| T26 | Data Health & traceability | 104, 60, 105, 61, 106, 59, 107, 67, 68 | TODO |
| **Tahap 7 — Fallback & Foto** ||||
| T27 | Manual exception input (WEB_MANUAL + quick entry) | 75, 108 | TODO |
| T28 | Photo/scan upload, deteksi dokumen, ekstraksi, review gate | 38, 133, 134, 135 | TODO |
| **Tahap 8 — Pilot** ||||
| T29 | Pilot/UAT: data pack Sukun, negative test, rekonsiliasi KPI, Lawang reusability | 69, 70, 71, 113 (terkait milik Andi: 109–112, 114) | TODO |
| **Tahap 9 — Phase 2** ||||
| T30 | Rollout Malang (DNM/PCK Cashflow+Menu) + inventory_movement | 79, 80, 81, 82, 83 | TODO |

---

## Rincian per tiket

### Tahap 1 — Akses & Shell

**Gerbang uji tahap:** login + MFA jalan; tiap role hanya melihat menu dan data yang
diizinkan; akses ditolak → 403; data PII tidak pernah keluar ke role manajemen.

#### T01 — RBAC + auth internal · Butuh: — · Status: IN REVIEW (B-ROLE)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T01.1 | SCRUM-20 | RBAC 2 role | IN REVIEW | U, UI | Data Operasional: upload, review issue, manual entry, Data Reference read-only. PM MBG: review/publish, ubah Data Reference, kelola anggota. Akses tercatat di audit. Export/dashboard tidak mengeluarkan field pribadi mentah |

#### T02 — App shell & tampilan · Butuh: T01 · Status: IN REVIEW
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T02.1 | SCRUM-21 | App shell & navigation | IN REVIEW | UI | Halaman Login, Overview, Upload, Mapping & Validasi, Finance, Kelengkapan Data, Data Reference, Manual Entry, Inbox, Anggota ada. Tanpa board Antrian Batch. Halaman tanpa izin → 403 |
| T02.2 | SCRUM-123 | Tampilan bersih, Rencana disembunyikan, Data Reference PM-only | IN REVIEW (B-PLAN) | UI | Subjudul kecil hilang. Biaya/penerima rencana tidak tampil di dashboard, tapi tetap ada di backend. Data Reference tanpa nama teknis, punya Alur Data 5 langkah, tombol Ubah hanya untuk PM |

#### T03 — Anggota & aktivasi · Butuh: T01 · Status: IN REVIEW
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T03.1 | SCRUM-121 | Undang & kelola anggota (PM MBG) | IN REVIEW (B-EMAIL) | U, UI | Form undangan tervalidasi. Status Menunggu aktivasi/Aktif/Kedaluwarsa/Nonaktif. Bisa kirim ulang, batalkan, ubah role, nonaktifkan/aktifkan. PM MBG terakhir tidak bisa dinonaktifkan. Semua aksi masuk audit |
| T03.2 | SCRUM-122 | Halaman aktivasi akun dari link undangan | IN REVIEW | U, UI | Penerima membuat kata sandi. Link kedaluwarsa/dibatalkan ditolak. Setelah aktif diarahkan ke Overview sesuai role |

#### T04 — Dapur reference · Butuh: T01 · Status: IN REVIEW (B-SCHEMA, B-LWG, B-TUREN)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T04.1 | SCRUM-132 | [DATA-052] Dapur reference & rollout-status | IN REVIEW | U, UI | kitchen_id dan label stabil. Turen non-production sampai ID resmi disetujui. Pengelompokan per region. Dapur Phase 2/belum terhubung → "Belum ada data", bukan 0 |

### Tahap 2 — Upload

**Gerbang uji tahap:** upload xlsx Cashflow, Menu, dan Input Maker Sukun (fixture)
menghasilkan batch dengan metadata lengkap; staging menyimpan nilai mentah utuh;
file rusak/kosong/terenkripsi → batch FAILED/Ditahan dengan pesan Bahasa Indonesia.

#### T05 — Upload batch & metadata · Butuh: T04 · Status: IN_PROGRESS (B-SCHEMA, B-ASSIGN)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T05.1 | SCRUM-22 | Create upload batch & metadata | IN REVIEW | U | Batch ID dibuat; file, source, uploader, kitchen, domain, timestamp, status tersimpan |
| T05.2 | SCRUM-37 | [DATA-001] Common upload batch metadata | IN REVIEW | U | upload_batch_id; kitchen_id, source_system, source_file_name, template_version, loaded_at tersimpan dan menempel di setiap baris staging |

#### T06 — Pipeline & halaman upload · Butuh: T05 · Status: IN_PROGRESS
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T06.1 | SCRUM-24 | Excel upload pipeline | IN REVIEW | U | xlsx/CSV diterima, di-parse ke staging, nilai baris mentah utuh. Re-parse idempoten |
| T06.2 | SCRUM-5 | Data Operasional - Upload existing files | IN REVIEW | UI | Data Operasional memilih kitchen/domain + file valid → batch dibuat dengan status Processing, hasil dan duplikat tampil |
| T06.3 | SCRUM-25 | Upload history/status | IN REVIEW | U, UI | Daftar batch dengan status, mapping profile, hasil validasi, waktu publish. UI tidak lagi mockup |

#### T07 — Parser Cashflow · Butuh: T06 · Status: IN_PROGRESS (B-SCHEMA, B-TPLVER)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T07.1 | SCRUM-35 | [DATA-002] Cashflow Upload v1 staging parser | IN REVIEW | U, D | Kolom sesuai Upload Contract diterima. Alias Lawang e/id didukung. Nilai mentah tidak hilang. Skema tidak valid → ditahan dan dilaporkan |

#### T08 — Parser Menu · Butuh: T06 · Status: IN_PROGRESS (B-SCHEMA)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T08.1 | SCRUM-36 | [DATA-003] Menu Upload v1 staging parser | IN REVIEW | U, D | Kontrak umum 23 field. PCK tanpa Periode ditangani lewat aturan metadata. Koma desimal didukung. Field mentah utuh. Ganti parser lama `menu-workbook.ts` |

#### T09 — Input Maker · Butuh: T06 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T09.1 | SCRUM-86 | [DATA-048] Input Maker Upload v1 raw staging contract | TODO (B-SCHEMA) | U | Skema input_maker_upload. Tanggal, keterangan, kategori, supplier, tagihan, checklist, link bukti tersimpan. Field bank/rekening dibatasi. Kontrak terdokumentasi dan berversi |
| T09.2 | SCRUM-118 | Input Maker Upload v1 + Sukun Raw Staging | TODO | U, D | Fixture Input Maker Sukun ter-staging lengkap dengan versi MAP-SKN-PAY-001 |
| — | SCRUM-126 | (duplikat SCRUM-118) | DUPLICATE | — | Tutup bersama SCRUM-118 |

#### T10 — Template resmi · Butuh: T07, T08 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T10.1 | SCRUM-130 | [DATA-050] Generate template resmi Cashflow & Menu | TODO (B-TPLVER) | U | Template Cashflow berisi Transaksi_Kas, Ringkasan_Transaksi, Referensi, Legenda_Kolom. Template Menu berisi Menu, Referensi, Legenda_Kolom. Header wajib, dropdown referensi, dan template_version konsisten |
| T10.2 | SCRUM-125 | Tombol Download Template | TODO | UI | Template Cashflow v1 & Menu v1 bisa diunduh kosong; dropdown dari Referensi; jenis data tanpa template memakai file biasa |
| T10.3 | SCRUM-131 | [DATA-051] Tolak template header-only | IN REVIEW | U, UI | Template valid tanpa baris data → status "Ditahan · file kosong", tidak ada staging/canonical, tombol unggah ulang tetap ada |

### Tahap 3 — Mapping

**Gerbang uji tahap:** batch Sukun Cashflow & Menu otomatis mendapat profil yang
benar (tercatat di audit batch); source/versi tidak dikenal masuk karantina; tidak ada
logika yang di-hardcode berdasarkan nama dapur.

#### T11 — Registry profil · Butuh: T06 · Status: IN_PROGRESS (B-REG default dipakai, B-DD)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T11.1 | SCRUM-26 | Mapping Profile Registry service/config | IN_PROGRESS (B-REG, B-DD) | U | Profil dimuat berdasarkan kitchen + domain + versi source |
| T11.2 | SCRUM-39 | [DATA-005] Detect & apply profile | IN_PROGRESS (B-TPLVER) | U | Source dikenal → profil terpilih secara deterministik. Versi/source tidak dikenal → karantina. Profil terpilih tersimpan di audit batch |

#### T12 — Mismatch · Butuh: T11 · Status: IN_PROGRESS (B-SCHEMA)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T12.1 | SCRUM-94 | Mapping/schema mismatch handling | IN_PROGRESS | U | File tidak dikenal/tidak kompatibel diblokir dengan pesan error yang bisa ditindaklanjuti |
| T12.2 | SCRUM-124 | Layar sederhana file kolom berbeda | IN REVIEW | UI | Data Operasional hanya melihat tabel perbedaan kolom + tombol Unggah Ulang File (tanpa Buat format baru/Tolak). File lama otomatis berstatus Diganti |

#### T13 — Sukun Cashflow · Butuh: T07, T11 · Status: IN REVIEW (B-DD)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T13.1 | SCRUM-55 | [DATA-022] Sukun Cashflow profile MAP-SKN-CF-001 | IN REVIEW (B-DD) | U, D | Parsing mata uang, grouping header/line, normalisasi kategori/unit. Versi mapping tersimpan. Sampel cocok dengan total sumber |
| T13.2 | SCRUM-27 | Sukun Cashflow adapter | IN REVIEW | U | Field wajib Cashflow termapping; Rp, total, unit, review status ditangani |

#### T14 — Cashflow dapur lain · Butuh: T13 · Status: TODO (B-SAMPLE-LWG, B-SAMPLE-OTHER, B-LWG)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T14.1 | SCRUM-56 | [DATA-023] Lawang Cashflow profile MAP-LWG-CF-001 | TODO | U, D | Alias e/id diterima; unit/kategori dinormalisasi; tabel kanonik sama dengan Sukun; tidak ada tabel KPI khusus Lawang |
| T14.2 | SCRUM-32 | Lawang Cashflow adapter | TODO | U | Model kanonik dipakai ulang dengan alias lokal, tanpa formula KPI khusus Lawang |
| T14.3 | SCRUM-57 | [DATA-024] Persiapan adapter DNM/PCK/SML | TODO | U | Variasi nama sheet DNM ditangani; alias PCK teruji; SML diperlakukan sebagai readiness, data kosong tidak dibaca sebagai 0 |

#### T15 — Menu mapping · Butuh: T08, T11 · Status: IN_PROGRESS (B-MAPOUT)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T15.1 | SCRUM-31 | Menu common adapter MAP-SKN-MENU-001 | IN_PROGRESS (siap review; B-DD) | U | Menu Upload v1 → menu_recipe_line; varian multi-sheet/header SKN ditangani |
| T15.2 | SCRUM-73 | [DATA-041] menu_recipe_line canonical transform | IN_PROGRESS (siap review; B-DD) | U, D | Baris berisi serving_date, kitchen/region, menu, porsi/segmen, gizi, porsi rencana, lineage. Sheet/baris duplikat di-dedup dengan key yang disepakati |
| T15.3 | SCRUM-58 | [DATA-025] Profil Menu 5 dapur | TODO (B-SAMPLE-LWG/OTHER) | U | Lima profil → menu_recipe_upload. Periode PCK eksplisit. Bumil/Busui DNM dipertahankan. Multi-ingredient SML di-flag, tidak dikarang |

### Tahap 4 — Kanonik Finance

**Gerbang uji tahap:** satu transaksi BELANJA multi-line hanya punya satu total;
Σ line_amount = transaction_total; rantai RAB→PO→GR→Payment Sukun tertelusur dengan ID stabil.

#### T16 — Transaksi kanonik · Butuh: T13 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T16.1 | SCRUM-77 | [DATA-006] finance_transaction canonical header | TODO | U | Key unik kitchen_id + transaction_id; total disimpan sekali; referensi source mentah ada; tipe dan arah kas dinormalisasi |
| T16.2 | SCRUM-40 | [DATA-007] finance_transaction_line detail | TODO | U | Tiap item punya transaction_line_id + FK ke header; line_amount numerik dan aman dijumlah; field item/supplier mentah ada |
| T16.3 | SCRUM-98 | Finance canonical transaction header/line | TODO | U | Total transaksi dan line amount terpisah; agregat aman diekspos |
| T16.4 | SCRUM-41 | [DATA-008] Anti-double-count | TODO | U | Rule DQ memblokir penjumlahan transaction_total per baris. **Wajib ada regression test** |

#### T17 — RAB → PO → GR → Payment · Butuh: T09, T16 · Status: TODO (B-RAW)
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T17.1 | SCRUM-44 | [DATA-011] Sukun RAB mapping profile | IN REVIEW (B-DD) | U, D | Layout presentasi di-flatten; record budget harian + bahan dibuat; planned cost tertelusur ke baris source |
| T17.2 | SCRUM-28 | Sukun RAB adapter | IN REVIEW | U | RAB → rab_daily_budget / rab_ingredient_budget |
| T17.3 | SCRUM-45 | [DATA-012] Sukun PO mapping + stable IDs | IN_PROGRESS (tabel ada; B-SRC-SKN) | U | po_id dan po_line_id stabil; label supplier/item mentah ada; FK ke rab_id bila ada; duplikat ditangani |
| T17.4 | SCRUM-29 | Sukun PO adapter | IN_PROGRESS (tabel ada; B-SRC-SKN) | U | List PO/Nota Pesanan → purchase_order_line |
| T17.5 | SCRUM-46 | [DATA-013] Goods Receipt mapping (opsional) | IN_PROGRESS (tabel ada; B-SRC-SKN) | U | receipt_id/line; qty_match_status diturunkan dari ordered vs received; flag manual tidak otoritatif. Bukan blocker Phase 1 |
| T17.6 | SCRUM-47 | [DATA-014] Vendor payment workflow chain | TODO | U | payment_request_id; link receipt/PO/supplier; timestamp maker, approval, payment; payment_reference wajib bila paid |
| T17.7 | SCRUM-30 | Sukun Payment adapter | TODO | U, D | input_maker_upload → vendor_payment_workflow. TAGIHAN/TANGGAL **tidak** otomatis jadi paid_amount/maker_input_time |

#### T18 — Saldo, beneficiary, PII · Butuh: T16 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T18.1 | SCRUM-49 | [DATA-016] finance_balance + source-of-truth guard | IN_PROGRESS (tabel ada; B-SRC-SKN, OD-02) | U | Satu saldo per kitchen × tanggal × rekening; source_system ada; KPI tetap draft sampai source resmi dikonfigurasi |
| T18.2 | SCRUM-50 | [DATA-017] beneficiary_daily_count | TODO | U | Key kitchen/tanggal/lokasi/segmen; planned dan actual terpisah; missing = NULL; tanpa PII individu |
| T18.3 | SCRUM-72 | [DATA-039] Restriksi PII beneficiary | TODO | U, UI | Dataset manajemen tanpa PII; tabel restricted terisolasi; akses tercatat; export/dashboard tidak bisa mengeluarkan NIK/nama/telepon/alamat |

### Tahap 5 — Validasi & Publish

**Gerbang uji tahap:** batch dengan Blocker tidak bisa di-publish; publish dua kali
tidak menggandakan fakta; batch koreksi menggantikan yang lama dan histori tetap bisa dibuka.

#### T19 — Normalisasi · Butuh: T07, T08 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T19.1 | SCRUM-52 | [DATA-019] Normalisasi tanggal/mata uang/unit/desimal | IN_PROGRESS (siap review) | U | Varian tanggal Excel/teks; Rp/angka; alias Kg/kg/Pax; koma/titik desimal; tanggal mustahil ditolak |
| T19.2 | SCRUM-53 | [DATA-020] Missing ≠ 0 | IN_PROGRESS (siap review; KPI di T24/T25) | U | NULL/MISSING dipertahankan; ada flag completeness; KPI membedakan 0 dan missing; source hilang tampil di Data Health |

#### T20 — Validation framework · Butuh: T19 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T20.1 | SCRUM-33 | Generic validation framework | IN_PROGRESS (siap review) | U | Severity Blocker/Warning/Info; detail baris + field + rule |
| T20.2 | SCRUM-51 | [DATA-018] Severity & quarantine | IN_PROGRESS (siap review; Data Health di T26) | U | Critical/High/Medium; aksi Reject/Review/Normalize/Flag; baris ditolak tetap tertelusur ke batch dan source; hasil tampil di Data Health |

#### T21 — Finance DQ · Butuh: T16, T20 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T21.1 | SCRUM-34 | Finance DQ rules (payung) | IN_PROGRESS (siap review; transfer di T21.3) | U | Anti-double-count, IDR numerik, klasifikasi transfer, missing ≠ 0 aktif sebagai rule |
| T21.2 | SCRUM-42 | [DATA-009] Normalisasi kategori via Master Reference | IN_PROGRESS (siap review; B-DD) | U | Kategori mentah dipertahankan; kategori normal dari master; nilai tak termapping di-flag |
| T21.3 | SCRUM-43 | [DATA-010] Klasifikasi transfer internal | IN_PROGRESS (siap review) | U | transaction_type mendukung transfer internal; KPI spend tidak menghitungnya; test mencakup pasangan mutasi |
| T21.4 | SCRUM-48 | [DATA-015] Urutan payment & SLA D0/D+1 | IN_PROGRESS (siap review; waktu langkah B-SRC-SKN) | U | receipt ≤ maker ≤ approval ≤ payment; klasifikasi SAME_DAY/D+1/BREACH; urutan invalid di-flag. Butuh T17.6 |
| T21.5 | SCRUM-84 | [DATA-046] Rekonsiliasi header ke Ringkasan_Transaksi | IN_PROGRESS (siap review) | U, D | Jumlah txn_id unik, total, dan review status dibandingkan; selisih material → blocker/warning; sheet ringkasan tidak membuat baris finance_transaction |
| T21.6 | SCRUM-119 | Cashflow Ringkasan_Transaksi Reconciliation | IN_PROGRESS (siap review) | U | Sama dengan T21.5, berlaku di setiap upload Cashflow |
| — | SCRUM-127 | (duplikat SCRUM-119) | DUPLICATE | — | Tutup bersama SCRUM-119 |

#### T22 — Menu DQ · Butuh: T15, T20 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T22.1 | SCRUM-85 | [DATA-047] Menu DQ lintas template dapur | IN_PROGRESS (Sukun siap review) | U, D | Periode PCK kosong; multi-sheet/casing SKN; label maternal + provenance harga DNM; multi-ingredient + kelengkapan SML; gizi/harga kosong LWG. Outlier di-review, tidak dikoreksi diam-diam |
| T22.2 | SCRUM-120 | Latest Cross-Kitchen Menu DQ Rules | IN_PROGRESS (Sukun siap review) | U | Periode kosong, koma desimal, sheet duplikat, plausibilitas gizi, provenance harga AI/inferred, varian Bumil/Busui, kelengkapan SML |
| — | SCRUM-128 | (duplikat SCRUM-120) | DUPLICATE | — | Tutup bersama SCRUM-120 |

#### T23 — Review & publish · Butuh: T20 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T23.1 | SCRUM-117 | Review & approval workflow PM | IN_PROGRESS (siap review) | U, UI | Status Menunggu Review PM & Dikembalikan; catatan wajib; tugas muncul di Inbox; tercatat di audit |
| T23.2 | SCRUM-54 | [DATA-021] Production eligibility by review_status | IN_PROGRESS (siap review) | U | Rule bisa dikonfigurasi (baseline: TERKONFIRMASI saja); status karantina dikecualikan tapi tetap terlihat; keputusan terdokumentasi |
| T23.3 | SCRUM-78 | [DATA-045] Publish idempoten + supersede lineage | IN_PROGRESS (siap review) | U | Publish pakai business key deterministik; batch koreksi menandai record lama superseded; lineage lama tetap bisa di-query |
| T23.4 | SCRUM-95 | Publish canonical batch | IN_PROGRESS (siap review) | U, UI | Hanya PM MBG, setelah review, tanpa blocker; idempoten; lineage terjaga |
| T23.5 | SCRUM-96 | Correction/supersede flow | IN_PROGRESS (siap review) | U, UI | Batch koreksi menggantikan yang lama tanpa kehilangan histori |

### Tahap 6 — KPI & Dashboard

**Gerbang uji tahap:** setiap angka widget cocok dengan hitungan manual dari fixture
yang sudah di-publish; filter periode/daerah konsisten; tiap KPI bisa ditelusuri ke file
dan baris source; data kosong tampil "Belum ada data", bukan 0.
Urutan di tiap task: **semantic query dulu (backend), lalu widget (UI).**

#### T24 — Widget Finance · Butuh: T21, T23 (T17 untuk Planned Cost, T18 untuk Saldo) · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T24.1 | SCRUM-62 | [DATA-029] Top 5 Supplier semantic query | TODO | U, D | Σ line_amount per supplier_id ternormalisasi; tanpa transfer internal/non-spend; tanpa double-count total |
| T24.2 | SCRUM-97 | Top 5 Supplier widget | TODO | UI | Widget menampilkan hasil T24.1 dan bisa ditelusuri |
| T24.3 | SCRUM-63 | [DATA-030] Expense Mix semantic query | TODO | U, D | Pakai kategori ternormalisasi; kategori tak termapping dikecualikan/di-flag; total cocok dengan spend |
| T24.4 | SCRUM-99 | Expense Mix widget | TODO | UI | Kategori master tampil; kategori mentah ada di trace |
| T24.5 | SCRUM-64 | [DATA-031] Planned Cost per Portion (feature flag) | TODO | U, D | Berlabel Planned/RAB; pakai RAB disetujui + porsi rencana; versi formula dicatat; tidak diam-diam jatuh ke actual spend |
| T24.6 | SCRUM-100 | Planned Cost per Portion widget | TODO | UI | Label Rencana; aturan alokasi bisa dikonfigurasi. Cek konflik dengan SCRUM-123 (B-PLAN) |
| T24.7 | SCRUM-65 | [DATA-032] Account Balance KPI | TODO | U | Baca source finance_balance yang dikonfigurasi; Draft/Unavailable sampai OD-02 ditutup; selisih rekonsiliasi didukung |
| T24.8 | SCRUM-101 | Account Balance widget | TODO | UI | Tampil Draft sampai source resmi disetujui |
| T24.9 | SCRUM-66 | [DATA-033] EFI Transfer + Last Transfer KPI | TODO | U | Tipe transaksi EFI Transfer terkontrol; event terakhir = tanggal + nominal + referensi; tidak dihitung sebagai external spend |
| T24.10 | SCRUM-102 | EFI Transfer widget | TODO | UI | Tampil tanggal/nominal/referensi transfer terakhir |

#### T25 — Widget Menu, Gizi, Beneficiary · Butuh: T15, T18, T22, T23 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T25.1 | SCRUM-74 | [DATA-042] Top 5 Menu semantic query | TODO | U, D | Pakai menu_recipe_line; window tanggal layanan (bukan nomor periode lokal); tanpa garnish/bumbu/makanan pokok; dasar ranking di feature flag sampai OD-13 |
| T25.2 | SCRUM-115 | Top 5 Menu widget | TODO | UI | Ranking per window 2 minggu & daerah; tertelusur ke menu_recipe_line |
| T25.3 | SCRUM-76 | [DATA-043] Nutrition & delivered-count query | TODO | U, D | Gizi dari menu_recipe_line; jumlah tersalurkan join beneficiary_daily_count; Missing tetap Missing; filter region/tanggal selaras |
| T25.4 | SCRUM-129 | [DATA-049] Validasi total segmen tersalurkan | TODO | U | Per dapur/periode, Σ segmen = total aktual; selisih → kartu di-flag/ditahan |
| T25.5 | SCRUM-116 | Informasi Gizi & Jumlah Tersalurkan widget | TODO | UI | Gizi per porsi Besar/Kecil; planned vs tersalurkan; Missing ≠ 0 |
| T25.6 | SCRUM-103 | Beneficiary aggregate widget | TODO | UI | Planned dan actual terpisah; tanpa PII |

#### T26 — Data Health & traceability · Butuh: T20, T23 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T26.1 | SCRUM-60 | [DATA-027] Metadata drill-down traceability | TODO | U | KPI mengekspos rantai lineage: source_file_name, source_record_id, upload_batch_id, source_system, profil; tanpa PII |
| T26.2 | SCRUM-105 | Source trace drilldown | TODO | UI | KPI → canonical → mapping profile → file/record source |
| T26.3 | SCRUM-61 | [DATA-028] Mapping/template change log | TODO | U | Log mencatat profil, versi lama/baru, effective_from, deskripsi, owner; upload versi tidak kompatibel diblokir |
| T26.4 | SCRUM-106 | Audit & change log | TODO | U, UI | Upload, mapping, publish, koreksi manual, perubahan versi tercatat |
| T26.5 | SCRUM-59 | [DATA-026] government_submission_log + dedup | IN_PROGRESS (siap review) | U | Submission merujuk source_record_id; sistem/modul/status tersimpan; KPI mengecualikan salinan submission |
| T26.6 | SCRUM-107 | Government submission lineage | IN_PROGRESS (siap review; UI di T26) | U | Submission SIPGN/POP/Aksis tertaut ke source_record_id, tanpa fakta ganda |
| T26.7 | SCRUM-67 | [DATA-034] Expected source checklist + completeness | TODO | U | Checklist per dapur/fase; status submitted/missing/error/accepted; source di luar scope dikecualikan; missing ≠ 0 |
| T26.8 | SCRUM-68 | [DATA-035] Validation queue | IN_PROGRESS (siap review) | U, UI | Filter dapur/batch/rule/severity; link ke source record; auto-fix terlihat; item bisa diproses ulang |
| T26.9 | SCRUM-104 | Data Health overview | TODO | UI | Kelengkapan, data hilang, error, jumlah issue, publish terakhir per dapur/domain |

### Tahap 7 — Fallback & Foto

**Gerbang uji tahap:** input manual dan hasil ekstraksi foto melewati validasi + review
PM yang **sama** dengan Excel; source resmi tidak pernah tertimpa diam-diam.

#### T27 — Manual entry · Butuh: T23 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T27.1 | SCRUM-75 | [DATA-044] Kontrak WEB_MANUAL + approval metadata | TODO | U | Simpan source_system, creator, created_at, review_status, reviewer, waktu approve/reject, alasan; source resmi tidak tertimpa |
| T27.2 | SCRUM-108 | Manual quick entry | TODO | U, UI | Data Operasional membuat draft WEB_MANUAL; PM approve/reject |

#### T28 — Foto/scan · Butuh: T06, T20, T23 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T28.1 | SCRUM-38 | [DATA-004] Metadata ingestion foto/scan | TODO (B-SCHEMA) | U | capture_method=PHOTO_UPLOAD, source_asset_id, extraction_confidence; asset asli disimpan; hasil ekstraksi tetap di staging sampai di-review |
| T28.2 | SCRUM-133 | Photo/Scan Upload & Source Asset Handling | TODO | U, UI | Upload foto/scan; dokumen asli, source_asset_id, metadata, akses, lineage tersimpan |
| T28.3 | SCRUM-134 | Deteksi tipe dokumen + ekstraksi field/tabel | TODO | U, D | Foto → field, baris, tabel, nilai mentah + normal, page/region, confidence |
| T28.4 | SCRUM-135 | Review, koreksi & publish gate ekstraksi | TODO | UI | Foto asli vs hasil ekstraksi berdampingan; confidence rendah ditandai; user bisa koreksi; lalu masuk mapping → validasi → review PM yang sama |

### Tahap 8 — Pilot/UAT

**Gerbang uji tahap:** demo end-to-end Sukun (upload → publish → dashboard → trace)
dengan data pack 2 minggu; minimal 10 titik data cocok dengan source.

#### T29 — Pilot · Butuh: T01–T26 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T29.1 | SCRUM-69 | [DATA-036] Pilot data pack Sukun | TODO | D | Minimal 2 minggu bersih berturut-turut; Cashflow, RAB, PO, payment, beneficiary, master, edge case; periode selaras |
| T29.2 | SCRUM-70 | [DATA-037] Negative test suite | TODO | U | Kasus: Rp, koma desimal, Periode kosong, total multi-line, sel multi-ingredient, tanggal rusak, receiving mismatch, nilai kosong |
| T29.3 | SCRUM-71 | [DATA-038] Rekonsiliasi KPI Phase 1 | TODO | D | ≥ 10 titik data; total spend cocok; planned cost RAB cocok; rantai trace lengkap; selisih dicatat |
| T29.4 | SCRUM-113 | Lawang reusability test | TODO | U, D | MAP-LWG-CF-001 jalan tanpa logika KPI khusus dapur. Butuh T14 |

Terkait (milik Andi, tidak dikerjakan Maulana): SCRUM-109 fixture pack, 110 demo script, 111 finance reconciliation test, 112 role/PII UAT, 114 triage defect.

### Tahap 9 — Phase 2

**Gerbang uji tahap:** dapur baru masuk **tanpa** halaman/flow/KPI baru; regression test
Phase 1 tetap lulus.

#### T30 — Rollout Malang + inventory · Butuh: T29 · Status: TODO
| Urut | Jira | Judul | Status kode | Uji | Selesai bila |
|---|---|---|---|---|---|
| T30.1 | SCRUM-79 | [DATA-P2-001] Donomulyo Cashflow MAP-DNM-CF-001 | TODO | U, D | Pakai Upload v1; variasi sheet/header/unit/kategori lokal; hasil finance_transaction/line; DQ/review/publish dipakai ulang |
| T30.2 | SCRUM-80 | [DATA-P2-002] Poncokusumo Cashflow MAP-PCK-CF-001 | TODO | U | Alias dinormalisasi; query KPI sama; regression test terhadap Phase 1 |
| T30.3 | SCRUM-81 | [DATA-P2-003] Donomulyo Menu MAP-DNM-MENU-001 | TODO | U | Bumil/Busui gabungan dipertahankan; semantic layer Top 5 Menu/Gizi dipakai ulang |
| T30.4 | SCRUM-82 | [DATA-P2-004] Poncokusumo Menu MAP-PCK-MENU-001 | TODO | U | Periode diturunkan dari aturan metadata/tanggal; kanonik dan widget sama |
| T30.5 | SCRUM-83 | [DATA-P2-005] inventory_movement canonical | TODO | U | Satu baris per mutasi; movement_type terkontrol; opening/in/out/adjustment/waste; aturan rekonsiliasi saldo; lineage |

---

Total: 104 tiket = 101 dikerjakan + 3 duplikat. SCRUM-22 (tanpa assignee di Jira) masuk T05.

## Dasar pengelompokan (dulu D-15 di decisions.md)

Sumber: JQL `project = SCRUM`, assignee Maulana Ibrahim, status belum Done (±100 tiket, banyak tumpang-tindih: tiket "adapter" vs "[DATA-xxx] profile", tiket widget vs semantic query-nya). Aturan: (1) tiket yang menghasilkan kode/dataset yang sama digabung (mis. SCRUM-27+55, 62+97); (2) duplikat persis (126, 127, 128) ikut task aslinya; (3) urutan = Tahap 1–3 di STATUS.md, lalu urutan epic PRD (kanonik → validasi/publish → KPI → health → manual/foto → UAT → Phase 2). Jira tidak diubah; status task diambil dari STATUS.md.
Diperluas 2026-10-25: TASKLIST memuat rincian **per tiket** (104), dengan nomor urut `Txx.y`, dependensi antar task (*Butuh*), kolom *Selesai bila* yang diringkas dari acceptance criteria Jira, jenis uji (`U` = `npm test` backend, `UI` = cek manual per role, `D` = rekonsiliasi data), dan gerbang uji per tahap. Di dalam satu task, urutannya: dataset/semantic query (backend) dulu, baru widget (UI).

## Label Jira per tahap (2026-10-26)

Label Inggris huruf kecil: `stage-N` + area fitur (+ `kitchen-<nama>`). Tiket duplikat (126-128) diberi label `duplicate`. Epic hanya dipindah bila parent salah; parent selain itu tidak diubah.

| Tahap | Label fitur | Tiket SCRUM |
|---|---|---|
| Stage 1 | auth-rbac, app-shell, member-management, data-reference | 20,21,121,122,123,132 (epic SCRUM-16) |
| Stage 2 | upload, upload-ui/batch/pipeline/history/template, input-maker | 5,22,24,25,35,36,37,86,118,125,126,130,131 (epic SCRUM-6; 36,86,118 dipindah ke SCRUM-6) |
| Stage 3 | mapping, mapping-registry, mapping-mismatch, cashflow, menu | 26,27,31,32,39,55,56,57,58,73,94,124 (epic SCRUM-12; 94,124 dipindah dari SCRUM-17/SCRUM-6) |
| Stage 4 | rab-po-payment, finance-canonical, finance-dataset | 28,29,30,40,41,44-47,49,50,72,77,98 |
| Stage 5 | normalization, validation, dq-finance, dq-menu, review-publish | 33,34,42,43,48,51-54,78,84,85,95,96,117,119,120,127,128 |
| Stage 6 | kpi-finance, kpi-menu, data-health | 59-68,74,76,97,99-107,115,116,129 |
| Stage 7 | manual-entry, photo-upload | 38,75,108,133-135 |
| Stage 8 | pilot-uat | 69,70,71,113 |
| Stage 9 | phase2-rollout | 79-83 |
