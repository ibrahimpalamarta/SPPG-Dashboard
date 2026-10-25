# SCRUM-39: [DATA-005] Detect & apply profile
Tahap: 3 | Status: IN_PROGRESS (sebagian BLOCKED: B-TPLVER) | Terakhir diubah: 2026-10-26

## Yang sudah dikerjakan
- [x] `detectProfile` (`lib/mapping/detect.ts`): kandidat = kitchen + domain + source system; cocok bila setiap sheet yang di-staging memuat semua header profil (perbandingan `loose`, kolom tambahan ditoleransi).
- [x] Tepat satu cocok → batch `NEEDS_REVIEW`, `mappingProfileId` + `templateVersion` (= versi profil) tersimpan di batch dan di setiap staging row; audit `upload_batch.profile_detected`.
- [x] Tidak cocok → `NEEDS_MAPPING_UPDATE` / `PROFILE_NOT_DETECTED` (karantina). Lebih dari satu cocok → `PROFILE_AMBIGUOUS`, tidak dipilih acak.
- [x] UI langkah 3 menampilkan profil terdeteksi.

## Sisa pekerjaan
- [ ] `templateVersion` dari sel metadata template sendiri (SCRUM-130, B-TPLVER)

## Test
`src/lib/mapping/detect.test.ts`, `src/controllers/upload/upload-batch.test.ts`
