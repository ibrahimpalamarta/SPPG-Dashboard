# STATUS — Tahap 1–3

Diperbarui: 2026-10-25. Kolom `Status` diisi dari audit kode, bukan dari Jira.
Branch Tahap 1 di-push dan direview lewat PR ke `develop`.

| Tiket | Judul | Tahap | Status | Status Jira (per 22 Okt) | Branch/PR | Update terakhir | Catatan singkat |
|---|---|---|---|---|---|---|---|
| SCRUM-20 | RBAC 2 role | 1 | IN_PROGRESS (sebagian BLOCKED: B-ROLE) | In Review | `fix/scrum-20-reference-edit-guard` | 2026-10-25 | Semua AC terpenuhi; tulis Data Reference kini butuh `reference:edit`; tersisa konfirmasi role |
| SCRUM-21 | App shell & navigation | 1 | IN_PROGRESS (sebagian BLOCKED: B-DOCS) | In Review | `feature/scrum-21-inbox-anggota` | 2026-10-25 | 10 halaman tiket ada (termasuk Inbox, Anggota) + guard 403; login internal menggantikan Auth0 |
| SCRUM-132 | [DATA-052] Dapur reference & rollout status | 3 (ditarik maju) | IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-LWG, B-TUREN) | To Do | `feature/scrum-132-kitchen-reference` | 2026-10-23 | bucket/rollout via config + API + Data Reference read-only; kolom menunggu approval |
| SCRUM-22 | Create upload batch & metadata | 2 | IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-ASSIGN) | In Progress | `feature/scrum-22-upload-batch` | 2026-10-23 | Backend selesai; kolom di luar [PRD] menunggu approval |
| SCRUM-37 | [DATA-001] Upload batch common metadata | 2 | IN_PROGRESS | To Do | `feature/scrum-22-upload-batch` | 2026-10-23 | Satu unit dengan SCRUM-22 |
| SCRUM-24 | Excel upload pipeline | 2 | IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-RAW) | In Progress | `feature/scrum-24-excel-pipeline` | 2026-10-23 | Reader semua sheet + registry + staging in-memory + FAILED codes selesai; staging persisten menunggu skema |
| SCRUM-5 | Halaman Upload Data | 2 | IN_PROGRESS (sebagian BLOCKED: B-AUTH0-FE) | In Progress | `feature/scrum-5-upload-page` | 2026-10-23 | Form + Server Action + hasil/status/duplikat selesai; tautan history menunggu SCRUM-25 |
| SCRUM-35 | [DATA-002] Cashflow Upload v1 parser | 2 | IN_PROGRESS (sebagian BLOCKED: B-SCHEMA, B-TPLVER) | To Do | `feature/scrum-35-cashflow-parser` | 2026-10-23 | Parser staging dari kontrak template Sukun; sheet PII dilewati; staging persisten menunggu skema |
| SCRUM-36 | [DATA-003] Menu Upload v1 parser | 2 | TODO | To Do | — | 2026-10-23 | Parser lama `menu-workbook.ts` hanya untuk dryRun, header tebakan |
| SCRUM-25 | Upload history/status | 2 | IN_PROGRESS | In Progress | — | 2026-10-23 | List/detail endpoint ada; UI hanya mockup |
| SCRUM-86 | [DATA-048] Input Maker Upload v1 contract | 2 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-118 | Input Maker Sukun raw staging | 2 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-126 | (duplikat SCRUM-118) | 2 | DUPLICATE | To Do | — | 2026-10-23 | Tidak dikerjakan |
| SCRUM-38 | [DATA-004] Photo/scan metadata | 2 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-130 | [DATA-050] Template resmi | 2 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-125 | Tombol Download Template | 2 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-131 | [DATA-051] Tolak template header-only | 2 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-124 | Layar kolom berbeda | 2 (setelah registry) | TODO | To Do | — | 2026-10-23 | |
| SCRUM-26 | Mapping Profile Registry | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-39 | [DATA-005] Detect & apply profile | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-94 | Schema mismatch handling | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-55 | [DATA-022] Sukun Cashflow profile | 3 | TODO | To Do | — | 2026-10-23 | Sampel + Kamus_Data Sukun tersedia (template, lihat SCRUM-35) |
| SCRUM-27 | Sukun Cashflow adapter | 3 | TODO | To Do | — | 2026-10-23 | Satu unit dengan SCRUM-55 |
| SCRUM-44 | [DATA-011] Sukun RAB profile | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-28 | Sukun RAB adapter | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-45 | [DATA-012] Sukun PO profile | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-29 | Sukun PO adapter + stable IDs | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-31 | Menu common adapter | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-58 | [DATA-025] Profil Menu 5 kitchen | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-30 | Sukun Payment adapter | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-56 | [DATA-023] Lawang Cashflow profile | 3 | TODO | To Do | — | 2026-10-23 | B-SAMPLE-LWG |
| SCRUM-32 | Lawang Cashflow adapter | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-57 | [DATA-024] Persiapan adapter DNM/PCK/SML | 3 | TODO | To Do | — | 2026-10-23 | |
| SCRUM-121 | Undang & kelola anggota | 1 | IN_PROGRESS (sebagian BLOCKED: B-EMAIL) | In Review | `feature/scrum-121-122-member-invite` | 2026-10-25 | Semua AC terpenuhi; tautan undangan disalin manual sampai ada email |
| SCRUM-122 | Aktivasi akun dari undangan | 1 | IN_PROGRESS (review) | In Review | `feature/scrum-121-122-member-invite` | 2026-10-25 | Halaman aktivasi + login otomatis ke Overview |
| SCRUM-123 | Tampilan bersih, Rencana disembunyikan, Data Reference PM-only | 1 (sisa) | TODO | To Do | — | 2026-10-23 | B-PLAN |
