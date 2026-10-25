# Kontrak file mentah dan format output

## `reports/raw/` (ditulis tool, dibaca merge-report)
| File | Penulis | Format |
|---|---|---|
| `tsc-<app>.json` | code-audit | `{ exitCode, output, prepareFailed? }`; `output` = tsc `--pretty false` |
| `eslint-frontend-admin.json` | ESLint `-f json` | format bawaan ESLint |
| `eslint-a11y-rules.json` | code-audit | `{ rules: string[] }` rule `jsx-a11y/*` yang aktif |
| `semgrep.sarif`, `gitleaks.sarif` | Semgrep / gitleaks | SARIF 2.1 |
| `<tool>.skipped.json` | code-audit | `{ reason }` — tool tidak terpasang |
| `<tool>.error.json` | code-audit | `{ exitCode, output }` — tool crash |
| `vitest.json` | Vitest reporter `json` | format Jest-compatible Vitest |
| `playwright.json` | Playwright reporter `json` | hasil run |
| `playwright-list.json` | `playwright test --list --reporter=json` | inventaris semua test (tanpa filter suite) |

Menambah tool baru = menulis file di sini + parser di `collect()` merge-report + aturan di `gate.json`.

## `reports/verdict.json`
```jsonc
{
  "verdict": "pass" | "fail" | "infra-error",
  "trigger": "pr" | "nightly" | "weekly" | "manual" | "local",
  "commit": "<sha>",
  "durationMs": 79000,
  "stages": { "code": "success", "logic": "success", "env": "success", "e2e": "success", "ui": "skipped", "report": "success" },
  "findings": [{ "severity": "Blocker", "tool": "tsc", "rule": "TS2322", "location": "backend/src/x.ts:1", "message": "...", "waived": "owner s/d tanggal: alasan" }],
  "pending": ["OD-02", "OD-03", "OD-04"],
  "requirements": [{ "id": "P1-001", "source": "prd", "status": "Lulus", "tests": ["... (passed)"] }]
}
```
`findings` terurut Blocker → Warning → Info. `waived` hanya ada bila waiver berlaku.

## Lainnya
| Output | Isi |
|---|---|
| `reports/scorecard.html` | Header verdict, ringkasan per tahap, temuan, bukti requirement, tautan laporan Playwright dan run CI. Tren 14 hari menyusul (fase 4) |
| `reports/pr-comment.md` | Komentar PR; baris pertama `<!-- qa-audit -->` adalah marker untuk update |
| `reports/playwright-report/` | Laporan HTML Playwright |
| `reports/playwright-results/` | Trace, screenshot, video gagal |
| `reports/env.log` | Log tahap 3 |
| `reports/evidence/<ticket>/` | Evidence P1-031 / P1-033, screenshot per langkah (fase 2) |
| Issue otomatis | Nightly/weekly gagal (fase 3/4) |
