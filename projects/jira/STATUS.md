# STATUS — Tahap 1–3

Tiket Tahap 1–2 dikelompokkan per fitur (folder `tickets/<tahap>/<subfitur>/`: `access/` = Tahap 1, `upload/` = Tahap 2); tiket Tahap 3 masih di `tickets/` langsung.

Diperbarui: 2026-10-27. Kolom `Status` diisi dari audit kode, bukan dari Jira.
Branch Tahap 1 di-push dan direview lewat PR ke `develop`.

| Tiket | Judul | Fitur | Tahap | Status | Status Jira (per 22 Okt) | Branch/PR | Update terakhir | Catatan singkat |
|---|---|---|---|---|---|---|---|---|
| SCRUM-20 | RBAC 2 role | access/rbac | 1 | IN_PROGRESS (sebagian BLOCKED: B-ROLE) | In Review | `fix/scrum-20-reference-edit-guard` | 2026-10-27 | Semua AC terpenuhi; tulis Data Reference kini butuh `reference:edit`; tersisa konfirmasi role |
| SCRUM-21 | App shell & navigation | access/app-shell | 1 | IN_PROGRESS (sebagian BLOCKED: B-DOCS) | In Review | `feature/scrum-21-inbox-anggota` | 2026-10-27 | 10 halaman tiket ada (termasuk Inbox, Anggota) + guard 403; login internal menggantikan Auth0 |
| SCRUM-123 | Tampilan bersih, Rencana disembunyikan, Data Reference PM-only | access/app-shell | 1 | IN_PROGRESS (sebagian BLOCKED: B-PLAN) | In Review | `feature/scrum-123-clean-ui` | 2026-10-27 | Subjudul dihapus, Alur Data + tombol Ubah khusus PM; tidak ada data rencana di UI |
| SCRUM-121 | Undang & kelola anggota | access/members | 1 | IN_PROGRESS (review) | In Review | `feature/scrum-121-122-member-invite` | 2026-10-27 | Semua AC terpenuhi; undangan dikirim lewat SES (B-EMAIL tertutup), tautan manual bila email gagal |
| SCRUM-122 | Aktivasi akun dari undangan | access/members | 1 | IN_PROGRESS (review) | In Review | `feature/scrum-121-122-member-invite` | 2026-10-27 | Halaman aktivasi + login otomatis ke Overview |
| SCRUM-132 | [DATA-052] Dapur reference & rollout status | access/kitchen-reference | 3 (ditarik maju) | IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-LWG, B-TUREN) | In Review | `feature/scrum-123-clean-ui` (review) | 2026-10-27 | AC kode terpenuhi; sisa keputusan kolom, Lawang, kode Turen |
| SCRUM-22 | Create upload batch & metadata | upload/batch | 2 | IN REVIEW | In Progress | `feature/upload-staging-persist` | 2026-10-27 | Backend selesai; staging_rows + SUPERSEDED termigrasi; kolom upload_batches di luar [PRD] menunggu approval |
| SCRUM-37 | [DATA-001] Upload batch common metadata | upload/batch | 2 | IN REVIEW | To Do | `feature/upload-staging-persist` | 2026-10-27 | Satu unit dengan SCRUM-22 |
| SCRUM-24 | Excel upload pipeline | upload/pipeline | 2 | IN REVIEW | In Progress | `feature/upload-staging-persist` | 2026-10-27 | xlsx + CSV (nilai mentah string) ke staging persisten `staging_rows`. Sisa: queue async |
| SCRUM-35 | [DATA-002] Cashflow Upload v1 parser | upload/pipeline | 2 | IN REVIEW | To Do | `feature/upload-staging-persist` | 2026-10-27 | Teruji juga dengan layout flat baseline Sukun (fixture anonim `sukun-cashflow.csv`). Sisa: alias Lawang (B-SAMPLE-LWG), template_version (B-TPLVER) |
| SCRUM-36 | [DATA-003] Menu Upload v1 parser | upload/pipeline | 2 | IN REVIEW | To Do | `feature/upload-staging-persist` | 2026-10-27 | `menuParser` 23 kolom baseline Sukun; `menu-workbook.ts` dihapus, dryRun pakai parser staging |
| SCRUM-5 | Halaman Upload Data | upload/ui | 2 | IN REVIEW | In Progress | `feature/upload-staging-persist` | 2026-10-27 | Form + Server Action + hasil/status/duplikat + tautan history selesai |
| SCRUM-25 | Upload history/status | upload/ui | 2 | IN REVIEW | In Progress | `feature/upload-staging-persist` | 2026-10-27 | Tabel history nyata dengan kolom profil/validasi/publish. Sisa: unduh berkas asli |
| SCRUM-124 | Layar kolom berbeda | upload/ui | 2 (setelah registry) | IN REVIEW | To Do | `feature/upload-staging-persist` | 2026-10-27 | Tabel perbedaan kolom + Unggah Ulang; batch lama → SUPERSEDED (label "Diganti") |
| SCRUM-130 | [DATA-050] Template resmi | upload/template | 2 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-125 | Tombol Download Template | upload/template | 2 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-131 | [DATA-051] Tolak template header-only | upload/template | 2 | IN REVIEW | To Do | `feature/upload-staging-persist` | 2026-10-27 | Header-only → EMPTY_FILE tanpa staging, badge "Ditahan · file kosong" + Unggah Ulang. Sisa: pengenalan template resmi (SCRUM-130, B-TPLVER) |
| SCRUM-86 | [DATA-048] Input Maker Upload v1 contract | input-maker | 2 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-118 | Input Maker Sukun raw staging | input-maker | 2 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-126 | (duplikat SCRUM-118) | input-maker | 2 | DUPLICATE | To Do | — | 2026-10-23 | Tidak dikerjakan |
| SCRUM-38 | [DATA-004] Photo/scan metadata | photo-upload | 2 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-26 | Mapping Profile Registry | mapping-registry | 3 | IN_PROGRESS (sebagian BLOCKED: B-REG, B-DD) | To Do | `feature/tahap3-mapping-sukun` | 2026-10-26 | `lib/mapping/profiles.ts` (default B-REG: config di repo); MAP-SKN-CF-001 + MAP-SKN-MENU-001 DRAFT |
| SCRUM-39 | [DATA-005] Detect & apply profile | mapping-registry | 3 | IN_PROGRESS (sebagian BLOCKED: B-TPLVER) | To Do | `feature/tahap3-mapping-sukun` | 2026-10-26 | Kitchen+domain+source+header; 1 cocok → NEEDS_REVIEW + audit `upload_batch.profile_detected`; 0/ >1 → karantina |
| SCRUM-94 | Schema mismatch handling | mapping-mismatch | 3 | IN_PROGRESS | To Do | `feature/tahap3-mapping-sukun` | 2026-10-26 | Diff `missing`/`unexpected` per sheet di response + errorSummary menyebut kolom hilang |
| SCRUM-55 | [DATA-022] Sukun Cashflow profile | mapping | 3 | IN_PROGRESS (sebagian BLOCKED: B-DD) | To Do | `feature/tahap3-mapping-sukun` | 2026-10-26 | Rekonsiliasi baseline asli lokal: 1009 txn, Σ total = sumber (Rp3.707.460.322) |
| SCRUM-27 | Sukun Cashflow adapter | mapping | 3 | IN_PROGRESS (sebagian BLOCKED: B-MAPOUT) | To Do | `feature/tahap3-mapping-sukun` | 2026-10-26 | Grouping per txn_id, Rp/qty/tanggal; issue NO_TXN_ID, MISSING_AMOUNT, LINES_NOT_TOTAL, TOTAL_INCONSISTENT; hasil belum disimpan |
| SCRUM-44 | [DATA-011] Sukun RAB profile | mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-28 | Sukun RAB adapter | mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-45 | [DATA-012] Sukun PO profile | mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-29 | Sukun PO adapter + stable IDs | mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-31 | Menu common adapter | menu-mapping | 3 | IN_PROGRESS (sebagian BLOCKED: B-MAPOUT, B-DD) | To Do | `feature/tahap3-mapping-sukun` | 2026-10-26 | MAP-SKN-MENU-001 multi-sheet; hasil belum disimpan |
| SCRUM-73 | [DATA-041] menu_recipe_line canonical transform | menu-mapping | 3 | IN_PROGRESS (sebagian BLOCKED: B-MAPOUT, B-DD) | To Do | `feature/tahap3-mapping-sukun` | 2026-10-26 | Segmen/menu type dirapikan, dedup `tanggal |
| SCRUM-58 | [DATA-025] Profil Menu 5 kitchen | menu-mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-30 | Sukun Payment adapter | mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-56 | [DATA-023] Lawang Cashflow profile | mapping | 3 | TODO | To Do | — | 2026-10-23 | B-SAMPLE-LWG |
| SCRUM-32 | Lawang Cashflow adapter | mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
| SCRUM-57 | [DATA-024] Persiapan adapter DNM/PCK/SML | mapping | 3 | TODO | To Do | — | 2026-10-23 |  |
