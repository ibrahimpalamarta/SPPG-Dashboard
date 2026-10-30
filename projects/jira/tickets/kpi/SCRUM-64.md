# SCRUM-64: [DATA-031] Planned Cost per Portion behind feature flag
Tahap: 7 | Status: IN_PROGRESS (siap review; B-PLAN) | Terakhir diubah: 2026-10-30

## Yang sudah dikerjakan
- [x] `plannedCostPerPortion`: Σ `planned_cost` RAB published ÷ Σ `package_count`, berlabel "Rencana/RAB", versi rumus di response, `incomplete` bila ada baris tanpa total (SCRUM-53) atau tanpa jumlah paket. Tidak pernah jatuh ke belanja aktual.
- [x] Di balik env `KPI_PLANNED_COST=true`; default mati karena B-PLAN (SCRUM-123 vs AC-DASH-01).

## Test
`src/lib/kpi.test.ts`; controller KPI diverifikasi ke Postgres nyata dan alur E2E (upload → publish → KPI) di env QA.
