import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { deliveredPortions, financeKpi, nutritionBySegment, plannedCostPerPortion, topMenus, type FinanceRow, type MenuRow } from './kpi.js';

const txn = (txnId: string, over: Partial<FinanceRow> = {}): FinanceRow => ({
  txnId,
  txnDate: new Date('2026-05-04'),
  txnTotal: 100,
  category: 'Bahan Baku',
  categoryNormalized: 'Bahan Baku',
  description: null,
  reviewStatus: 'TERKONFIRMASI',
  isExternalSpend: true,
  isEfiTransfer: false,
  lines: [{ counterparty: 'Toko A', lineAmount: 100 }],
  ...over,
});

describe('finance KPIs (SCRUM-62/63/66/54)', () => {
  const rows = [
    // Three lines repeating a total of 300: the supplier gets Σ lines, never 3 × 300 (anti-double-count).
    txn('T1', { txnTotal: 300, lines: [{ counterparty: 'Toko A', lineAmount: 100 }, { counterparty: ' toko  a', lineAmount: 100 }, { counterparty: 'UD B', lineAmount: 100 }] }),
    txn('T2', { txnTotal: 50, category: 'Lain-lain', categoryNormalized: null, lines: [{ counterparty: 'UD B', lineAmount: 50 }] }),
    txn('T3', { reviewStatus: 'PERLU_REVIEW', txnTotal: 999 }),
    txn('T4', { isExternalSpend: false, txnTotal: 500, lines: [{ counterparty: 'Petugas', lineAmount: 500 }] }),
    txn('T5', { isExternalSpend: false, isEfiTransfer: true, txnTotal: 30_000, txnDate: new Date('2026-05-07'), description: 'Insentif Yayasan Minggu 1' }),
    txn('T6', { txnTotal: null, lines: [{ counterparty: 'UD C', lineAmount: null }] }),
  ];
  const k = financeKpi(rows);

  test('only eligible external spend counts; held and missing are reported, not zeroed', () => {
    assert.deepEqual(k.spend, { total: 350, transactions: 3, perDay: 350, held: 1, missingTotals: 1 });
  });

  test('top suppliers fold spelling and sum lines', () => {
    // UD C's only line has no amount: it is missing, not a Rp0 supplier.
    assert.deepEqual(
      k.topSuppliers.map((s) => [s.name, s.amount]),
      [
        ['Toko A', 200],
        ['UD B', 150],
      ],
    );
    assert.equal(k.topSuppliers.reduce((n, s) => n + s.share, 0), 1);
  });

  test('expense mix uses master categories; unmapped is kept apart but stays in the total', () => {
    assert.deepEqual(k.expenseMix.categories.map((c) => [c.category, c.amount]), [['Bahan Baku', 300]]);
    assert.deepEqual(k.expenseMix.unmapped, { amount: 50, raw: ['Lain-lain'] });
  });

  test('EFI transfers are their own KPI and never spend', () => {
    assert.deepEqual(k.efi.latest, { date: '2026-05-07', amount: 30_000, ref: 'T5', description: 'Insentif Yayasan Minggu 1' });
    assert.ok(!k.topSuppliers.some((s) => s.amount === 30_000));
  });
});

describe('planned cost per portion (SCRUM-64)', () => {
  test('RAB cost ÷ packages, labelled plan, incomplete when a total or package count is missing', () => {
    const p = plannedCostPerPortion([
      { plannedCost: 1_000_000, packageCount: 100, missingLineTotals: 0 },
      { plannedCost: 500_000, packageCount: 50, missingLineTotals: 1 },
    ]);
    assert.equal(p.value, 10_000);
    assert.equal(p.label, 'Rencana/RAB');
    assert.equal(p.incomplete, true);
    assert.equal(plannedCostPerPortion([]).value, null);
  });
});

const line = (over: Partial<MenuRow>): MenuRow => ({
  kitchenId: '1',
  kitchenName: 'Sukun',
  servingDate: new Date('2026-05-04'),
  menuType: 'Basah',
  portionSegment: 'Besar',
  menuName: 'Ayam Goreng',
  plannedPortions: 400,
  energyKcal: 100,
  proteinG: 10,
  fatG: 5,
  carbohydrateG: 20,
  fiberG: 1,
  ...over,
});

describe('menu KPIs (SCRUM-74/76/116)', () => {
  test('top menus rank by distinct serving days and skip staples/seasoning', () => {
    const top = topMenus([
      line({}),
      line({ menuName: 'ayam goreng ', portionSegment: 'Kecil' }),
      line({ servingDate: new Date('2026-05-05') }),
      line({ menuName: 'Susu UHT' }),
      line({ menuName: 'Nasi Putih' }),
      line({ menuName: 'Bumbu Kacang' }),
    ]);
    assert.deepEqual(top.map((m) => [m.name, m.days]), [['Ayam Goreng', 2], ['Susu UHT', 1]]);
  });

  test('nutrition per portion sums a day, averages complete days only; planned = largest Jumlah PM per day', () => {
    const [besar] = nutritionBySegment([
      line({ menuName: 'Nasi', energyKcal: 200 }),
      line({ plannedPortions: 450 }),
      line({ servingDate: new Date('2026-05-05'), energyKcal: 300, fiberG: null, plannedPortions: 420 }),
    ]);
    assert.equal(besar?.perPortion.energyKcal, (300 + 300) / 2);
    // Day 2 has no fiber: only day 1 counts for it, and the day is reported incomplete.
    assert.equal(besar?.perPortion.fiberG, 2);
    assert.equal(besar?.incompleteDays, 1);
    assert.equal(besar?.plannedPortions, 450 + 420);
  });
});

describe('delivered portions & beneficiaries (SCRUM-50/103/129/72)', () => {
  test('no actual counts is MISSING, never 0', () => {
    const d = deliveredPortions([{ segment: 'Besar', plannedCount: 400, actualCount: null }]);
    assert.equal(d.actual, null);
    assert.equal(d.status, 'MISSING');
    assert.equal(d.planned, 400);
  });

  test('a source total that disagrees with Σ segments flags the card', () => {
    const d = deliveredPortions([
      { segment: 'Besar', plannedCount: 400, actualCount: 390 },
      { segment: 'Kecil', plannedCount: 300, actualCount: 300 },
      { segment: 'Total', plannedCount: null, actualCount: 700 },
    ]);
    assert.equal(d.actual, 690);
    assert.equal(d.status, 'MISMATCH');
  });

  test('the output is aggregate only: no person-level field exists to leak', () => {
    const json = JSON.stringify(deliveredPortions([{ segment: 'Besar', plannedCount: 1, actualCount: 1 }]));
    for (const pii of ['nik', 'nama', 'name', 'telepon', 'phone', 'alamat', 'address']) assert.ok(!json.toLowerCase().includes(`"${pii}"`), pii);
  });
});
