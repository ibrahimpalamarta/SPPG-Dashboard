import { describe, expect, it } from 'vitest';
import { financeKpi, plannedCostPerPortion, type FinanceRow } from '../../../backend/src/lib/kpi.js';
import { parseNumber } from '../../../backend/src/lib/mapping/values.js';

// Aturan PRD yang dibuktikan langsung pada fungsi murni backend, supaya scorecard mengikatnya ke ID
// requirement. Detail dan kasus tepi ada di backend/src/lib/*.test.ts; ini hanya jaring pengaman per AC.
const txn = (txnId: string, over: Partial<FinanceRow> = {}): FinanceRow => ({
  txnId,
  txnDate: new Date('2026-05-04'),
  txnTotal: 300,
  category: 'Belanja bahan',
  categoryNormalized: 'Bahan Baku',
  description: null,
  reviewStatus: 'TERKONFIRMASI',
  isExternalSpend: true,
  isEfiTransfer: false,
  lines: [{ counterparty: 'Toko A', lineAmount: 100 }, { counterparty: 'Toko A', lineAmount: 100 }, { counterparty: 'Toko B', lineAmount: 100 }],
  ...over,
});

describe('aturan PRD pada fungsi murni backend', () => {
  it('[AC-DQ-01] Rp65,000 dan Rp65.000 dinormalisasi ke angka 65000', () => {
    for (const raw of ['Rp65,000', 'Rp65.000']) expect(parseNumber({ value: raw, type: 'string' }, true)).toBe(65000);
  });

  it('[AC-DQ-02] transaction_total yang berulang di tiap baris tidak dijumlahkan per baris', () => {
    const k = financeKpi([txn('T1')]);
    expect(k.spend.total).toBe(300);
    expect(k.topSuppliers.map((s) => [s.name, s.amount])).toEqual([['Toko A', 200], ['Toko B', 100]]);
  });

  it('[AC-DQ-04] total yang hilang dihitung sebagai hilang, bukan 0', () => {
    const k = financeKpi([txn('T1', { txnTotal: null, lines: [{ counterparty: 'Toko C', lineAmount: null }] })]);
    expect(k.spend.missingTotals).toBe(1);
    expect(k.spend.perDay).toBeNull();
    expect(k.topSuppliers).toEqual([]);
  });

  it('[AC-DASH-02] transfer internal tidak masuk belanja eksternal dan Top Supplier', () => {
    const k = financeKpi([txn('T1', { isExternalSpend: false, isEfiTransfer: true, txnTotal: 30_000, lines: [{ counterparty: 'Yayasan', lineAmount: 30_000 }] })]);
    expect(k.spend.total).toBe(0);
    expect(k.topSuppliers).toEqual([]);
  });

  it('[AC-DASH-03] Expense Mix memakai kategori ternormalisasi, kategori sumber tetap tercatat', () => {
    const k = financeKpi([txn('T1')]);
    expect(k.expenseMix.categories).toMatchObject([{ category: 'Bahan Baku', amount: 300, raw: ['Belanja bahan'] }]);
  });

  it('[AC-DASH-01] Planned Cost per Portion berlabel Rencana/RAB', () => {
    expect(plannedCostPerPortion([{ plannedCost: 1_000_000, packageCount: 100, missingLineTotals: 0 }]).label).toBe('Rencana/RAB');
  });
});
