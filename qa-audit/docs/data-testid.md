# Usulan kontrak `data-testid` (untuk tim front-end)

qa-audit **tidak** mengubah kode aplikasi. Selector utama adalah role dan label; atribut di bawah
diusulkan hanya untuk elemen yang tidak punya nama aksesibel yang stabil. Status: **usulan,
belum disepakati**.

| `data-testid` | Elemen | Isi yang diuji | Requirement |
|---|---|---|---|
| `cost-basis-label` | Label basis biaya di kartu Planned Cost / Portion | Teks `Rencana` / `RAB-based` | AC-DASH-01 |
| `balance-status` | Badge status Account Balance | `Draft` / `TBD` sebelum OD-02, `Official` sesudahnya | AC-DASH-04, OD-02 |
| `efi-transfer-status` | Badge status EFI Transfer | Bukan official sebelum OD-03 | AC-DASH-05, OD-03 |
| `data-refreshed-at` | Timestamp "terakhir diperbarui" | Ada; di-mask di screenshot | AC-HEALTH-01 |
| `kpi-<nama>` | Nilai KPI, mis. `kpi-top-spend`, `kpi-expense-mix` | Nilai / `Missing` (bukan 0) | AC-DQ-04, AC-DASH-02/03 |
| `source-trace-open` | Tombol buka source trace dari KPI | Membuka trace | AC-TRACE-01 |
| `batch-status` | Status batch upload | Processing / Needs Review / ... | AC-UP-01, FR-UP-05 |

Sampai atribut dipasang, test terkait memakai role/label; bila elemen belum ada sama sekali,
test tetap `fixme` (*Menunggu fitur*).
