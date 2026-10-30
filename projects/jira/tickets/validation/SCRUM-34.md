# SCRUM-34: Finance DQ rules
Tahap: 4 | Status: IN_PROGRESS (siap review; klasifikasi transfer di Tahap 5) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] Rule finance terdaftar di `lib/validation/rules.ts`: NO_TXN_ID (CRITICAL/REJECT), TOTAL_INCONSISTENT + LINES_NOT_TOTAL (CRITICAL, anti-double-count DQ-004), MISSING_REQUIRED (CRITICAL), MISSING_AMOUNT + LINE_AMOUNT_MISMATCH (HIGH), NEEDS_REVIEW (MEDIUM/FLAG, DQ-025).
- [x] IDR numerik lewat `parseNumber(..., money)`; missing ≠ 0 (SCRUM-53).

## Sisa pekerjaan
- [ ] Klasifikasi transfer internal (SCRUM-43, Tahap 5)
