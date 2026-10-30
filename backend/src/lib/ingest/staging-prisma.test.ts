import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { PrismaStagingRepository, type StagedBatch, type StagingRow } from './staging.js';

const row = (n: number): StagingRow => ({
  uploadBatchId: 'b-1',
  sourceRecordId: `SKN:MENU:abc:Menu:${n}`,
  kitchenId: 'SKN',
  sourceSystem: 'INTERNAL',
  sourceFileName: 'menu.csv',
  templateVersion: null,
  mappingProfileId: null,
  loadedAt: new Date('2026-10-26T00:00:00Z'),
  sheetName: 'Menu',
  sourceRowNumber: n,
  cells: { A: { value: '31,25', type: 'string' } },
});

/** Records calls and keeps rows in an array, like staging_rows would. */
function fakeDb() {
  const table: Record<string, unknown>[] = [];
  const calls: string[] = [];
  const stagingRow = {
    deleteMany: async ({ where }: { where: { uploadBatchId: string } }) => {
      calls.push('delete');
      for (let i = table.length - 1; i >= 0; i--) if (table[i].uploadBatchId === where.uploadBatchId) table.splice(i, 1);
    },
    createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
      calls.push(`create:${data.length}`);
      table.push(...data.map((d, i) => ({ id: BigInt(table.length + i + 1), ...d })));
    },
    findMany: async ({ where }: { where: { uploadBatchId: string } }) => table.filter((r) => r.uploadBatchId === where.uploadBatchId),
  };
  const db = { stagingRow, $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ stagingRow }) } as unknown as PrismaClient;
  return { db, calls, table };
}

describe('PrismaStagingRepository (SCRUM-24)', () => {
  const batch = (n: number): StagedBatch => ({ domain: 'MENU', sheets: [], rows: Array.from({ length: n }, (_, i) => row(i + 2)) });

  test('replace deletes first, so a re-parse leaves no stale rows (idempotent)', async () => {
    const { db, calls, table } = fakeDb();
    const repo = new PrismaStagingRepository(db);
    await repo.replaceBatch('b-1', batch(3));
    await repo.replaceBatch('b-1', batch(2));
    assert.equal(table.length, 2);
    assert.deepEqual(calls, ['delete', 'create:3', 'delete', 'create:2']);
  });

  test('large batches are written in chunks', async () => {
    const { db, calls } = fakeDb();
    await new PrismaStagingRepository(db).replaceBatch('b-1', batch(4500));
    assert.deepEqual(calls.filter((c) => c.startsWith('create')), ['create:2000', 'create:2000', 'create:500']);
  });

  test('raw cells and the domain round-trip; unknown batch is undefined', async () => {
    const { db } = fakeDb();
    const repo = new PrismaStagingRepository(db);
    await repo.replaceBatch('b-1', batch(1));
    const got = await repo.getBatch('b-1');
    assert.equal(got?.domain, 'MENU');
    assert.equal(got?.rows[0].cells.A.value, '31,25');
    assert.equal(await repo.getBatch('nope'), undefined);
  });
});

describe('PrismaStagingRepository writes the mapped records (B-MAPOUT)', () => {
  const calls: string[] = [];
  const traced: Record<string, unknown>[] = [];
  const many = (name: string) => async ({ data }: { data: unknown[] }) => void calls.push(`${name}:${data.length}`);
  const del = (name: string) => async () => void calls.push(`${name}:delete`);
  const tx = {
    uploadBatch: { findUniqueOrThrow: async () => ({ kitchenId: 7n, sourceSystem: 'INTERNAL', fileName: 'cf.xlsx' }) },
    stagingRow: { deleteMany: del('staging'), createMany: many('staging') },
    financeTransaction: {
      deleteMany: del('txn'),
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        calls.push(`txn:${data.length}`);
        traced.push(...data);
      },
    },
    financeTransactionLine: { createMany: many('line') },
    rabDailyBudget: {
      deleteMany: del('day'),
      createManyAndReturn: async ({ data }: { data: { budgetDate: Date; portionSegment: string }[] }) => {
        calls.push(`day:${data.length}`);
        return data.map((d, i) => ({ id: BigInt(i + 1), budgetDate: d.budgetDate, portionSegment: d.portionSegment }));
      },
    },
    vendorPaymentWorkflow: {
      deleteMany: del('pay'),
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        calls.push(`pay:${data.length}`);
        traced.push(...data);
      },
    },
    rabIngredientBudget: { createMany: async ({ data }: { data: { dailyBudgetId: bigint }[] }) => void calls.push(`ing:${data.map((d) => d.dailyBudgetId).join(',')}`) },
    validationIssue: {
      deleteMany: del('issue'),
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        calls.push(`issue:${data.length}`);
        traced.push(...data);
      },
    },
    menuRecipeLine: {
      deleteMany: del('menu'),
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        calls.push(`menu:${data.length}`);
        traced.push(...data);
      },
    },
  };
  const repo = new PrismaStagingRepository({ $transaction: async (fn: (t: unknown) => Promise<void>) => fn(tx) } as unknown as PrismaClient);
  const empty: StagedBatch = { domain: 'CASHFLOW', sheets: [], rows: [] };
  const loadedAt = new Date('2026-10-27T00:00:00Z');

  test('Cashflow: headers first, then lines, after the old canonical rows are cleared', async () => {
    calls.length = 0;
    const line = (id: string) => ({ source_record_id: id, line_id: null, item_name: null, counterparty: null, qty: 1, unit: 'kg', unit_price: 5, line_amount: 5 });
    const txn = { txn_id: 'T1', txn_date: '2026-03-05', txn_type: 'BELANJA', direction: 'KELUAR', category: null, category_normalized: null, description: null, txn_total: 10, is_external_spend: true, is_internal_transfer: false, review_status: null, review_note: null, confidence: null, lines: [line('a'), line('b')] };
    await repo.replaceBatch('b-1', empty, { profileId: 'MAP-SKN-CF-001', templateVersion: '1', loadedAt, domain: 'CASHFLOW', records: [txn] });
    assert.deepEqual(calls, ['staging:delete', 'txn:delete', 'day:delete', 'pay:delete', 'menu:delete', 'issue:delete', 'txn:1', 'line:2']);
  });

  test('every canonical record carries the PRD §7.2 traceability fields', async () => {
    traced.length = 0;
    const line = { source_record_id: 'SKN:CASHFLOW:abc:Transaksi_Kas:2', line_id: null, item_name: null, counterparty: null, qty: 1, unit: 'kg', unit_price: 5, line_amount: 5 };
    const txn = { txn_id: 'T1', txn_date: '2026-03-05', txn_type: 'BELANJA', direction: 'KELUAR', category: null, category_normalized: null, description: null, txn_total: 5, is_external_spend: true, is_internal_transfer: false, review_status: null, review_note: null, confidence: null, lines: [line] };
    await repo.replaceBatch('b-1', empty, { profileId: 'MAP-SKN-CF-001', templateVersion: '1', loadedAt, domain: 'CASHFLOW', records: [txn] });
    assert.deepEqual(traced[0], {
      uploadBatchId: 'b-1',
      mappingProfileId: 'MAP-SKN-CF-001',
      kitchenId: 7n,
      sourceSystem: 'INTERNAL',
      sourceFileName: 'cf.xlsx',
      templateVersion: '1',
      loadedAt,
      sourceRecordId: 'SKN:CASHFLOW:abc:Transaksi_Kas:2',
      txnId: 'T1',
      txnDate: new Date('2026-03-05'),
      txnType: 'BELANJA',
      direction: 'KELUAR',
      category: null,
      categoryNormalized: null,
      description: null,
      txnTotal: 5,
      isExternalSpend: true,
      isInternalTransfer: false,
      reviewStatus: null,
      reviewNote: null,
      confidence: null,
    });
  });

  test('RAB: ingredient rows get the id of their (date, segment) budget', async () => {
    calls.length = 0;
    const ing = (id: string) => ({ source_record_id: id, menu_type: null, menu_name: null, ingredient: null, unit_price: null, line_total: 1, beneficiaries: null, ingredient_need_kg: null, packaged_need_pax: null });
    const days = [
      { budget_date: '2026-02-23', portion_segment: 'Kecil', planned_cost: 2, package_count: 84, lines: [ing('a'), ing('b')] },
      { budget_date: '2026-02-23', portion_segment: 'Besar', planned_cost: 1, package_count: null, lines: [ing('c')] },
    ];
    await repo.replaceBatch('b-1', { ...empty, domain: 'RAB' }, { profileId: 'MAP-SKN-RAB-001', templateVersion: '1', loadedAt, domain: 'RAB', records: days });
    assert.deepEqual(calls.slice(-2), ['day:2', 'ing:1,1,2']);
  });

  test('no mapped records: only staging is touched', async () => {
    calls.length = 0;
    await repo.replaceBatch('b-1', empty);
    assert.deepEqual(calls, ['staging:delete']);
  });

  test('Input Maker: requests are stored with no paid state or workflow times (OD-14)', async () => {
    calls.length = 0;
    traced.length = 0;
    const rec = { source_record_id: 'SKN:INPUT_MAKER:abc:P1:3', payment_request_id: 'PAY-SKN-0123456789ab', line_no: '1', request_date: '2026-03-05', description: 'Beras', category: 'Bahan Baku', supplier: 'UD Maju', request_amount: 1500000, checklist: true, supplier_invoice_link: null, payment_invoice_link: null };
    await repo.replaceBatch('b-1', { ...empty, domain: 'INPUT_MAKER' }, { profileId: 'MAP-SKN-PAY-001', templateVersion: '1', loadedAt, domain: 'INPUT_MAKER', records: [rec] });
    assert.deepEqual(calls, ['staging:delete', 'txn:delete', 'day:delete', 'pay:delete', 'menu:delete', 'issue:delete', 'pay:1']);
    const [row] = traced;
    assert.equal(row?.paymentRequestId, 'PAY-SKN-0123456789ab');
    assert.equal(row?.requestAmount, 1500000);
    assert.equal(row?.mappingProfileId, 'MAP-SKN-PAY-001');
    for (const k of ['paidAt', 'paidAmount', 'paymentReference', 'approvedAt', 'makerInputAt']) assert.ok(!(k in row!), k);
  });

  test('issues are stored with their severity and action, traceable to the source row (SCRUM-51)', async () => {
    calls.length = 0;
    traced.length = 0;
    const issues = [
      { code: 'NO_TXN_ID', rule: 'DQ-001', sourceRecordId: 'SKN:CASHFLOW:abc:Transaksi_Kas:9', message: 'tanpa txn_id' },
      { code: 'SOMETHING_NEW', message: 'kode belum terdaftar' },
    ];
    await repo.replaceBatch('b-1', empty, { profileId: 'MAP-SKN-CF-001', templateVersion: '1', loadedAt, domain: 'CASHFLOW', records: [], issues });
    assert.ok(calls.includes('issue:2'));
    assert.deepEqual(traced.map((t) => [t.code, t.severity, t.action, t.sourceRecordId, t.kitchenId]), [
      ['NO_TXN_ID', 'CRITICAL', 'REJECT', 'SKN:CASHFLOW:abc:Transaksi_Kas:9', 7n],
      // Unregistered codes are reviewed, never waved through.
      ['SOMETHING_NEW', 'HIGH', 'REVIEW', null, 7n],
    ]);
  });

  test('Menu: recipe lines are stored with planned portions and NULLs kept (SCRUM-73)', async () => {
    calls.length = 0;
    traced.length = 0;
    const nums = { gross_weight_g: null, net_weight_g: 80, edible_portion_pct: null, urt_qty: null, energy_kcal: 120, protein_g: 3, fat_g: null, carbohydrate_g: 25, fiber_g: null, beneficiaries: 350, ingredient_need_kg: 28, packaged_need_pax: null, unit_price: 14000, line_total: 392000 };
    const rec = { source_record_id: 'SKN:MENU:abc:Menu:4', kitchen_id: 'SKN', period: '1', serving_date: '2026-02-23', day_name: 'Senin', menu_type: 'Makanan Pokok', portion_segment: 'Besar', menu_name: 'Nasi Putih', ingredient: 'Beras', urt_unit: null, ...nums };
    await repo.replaceBatch('b-1', { ...empty, domain: 'MENU' }, { profileId: 'MAP-SKN-MENU-001', templateVersion: '1', loadedAt, domain: 'MENU', records: [rec] });
    assert.deepEqual(calls, ['staging:delete', 'txn:delete', 'day:delete', 'pay:delete', 'menu:delete', 'issue:delete', 'menu:1']);
    const [row] = traced;
    assert.equal(row?.servingDate instanceof Date, true);
    assert.equal(row?.plannedPortions, 350);
    assert.equal(row?.fatG, null);
    assert.equal(row?.mappingProfileId, 'MAP-SKN-MENU-001');
  });
});
