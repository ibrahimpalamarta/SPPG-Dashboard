import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { staged, withRows } from '../ingest/fixtures.js';
import type { RawSheet } from '../ingest/workbook.js';
import type { CashflowTxn } from './sukun-cashflow.js';
import { normalizeCategories, reconcileRingkasan } from './cashflow-checks.js';
import { classifySla } from './payment-sla.js';

const txn = (txn_id: string, over: Partial<CashflowTxn> = {}): CashflowTxn => ({
  txn_id,
  txn_date: '2026-02-22',
  txn_type: 'BELANJA',
  direction: 'KELUAR',
  category: 'Bahan Baku',
  category_normalized: null,
  description: null,
  txn_total: 1000,
  is_external_spend: true,
  is_internal_transfer: false,
  review_status: 'TERKONFIRMASI',
  review_note: null,
  confidence: null,
  lines: [],
  ...over,
});

const str = (value: string | number) => ({ value, type: typeof value === 'number' ? ('number' as const) : ('string' as const) });
const ringkasan = (rows: [string, number, string][]): RawSheet => ({
  name: 'Ringkasan_Transaksi',
  index: 2,
  rows: [
    { rowNumber: 1, cells: { A: str('txn_id'), B: str('total'), C: str('status_review') } },
    ...rows.map(([id, total, status], i) => ({ rowNumber: i + 2, cells: { A: str(id), B: str(total), C: str(status) } })),
  ],
});

describe('SCRUM-42 category normalisation against the Master Reference', () => {
  test('raw label kept, master label filled, unknown ones flagged once per label', () => {
    const txns = [txn('T1', { category: 'bahan baku' }), txn('T2', { category: 'Insentif Fasilitas' }), txn('T3', { category: 'Lain-lain' }), txn('T4', { category: 'Lain-lain' })];
    const issues = normalizeCategories(txns, ['Bahan Baku', 'Operasional', 'Insentif & Fasilitas', 'Kas kecil']);
    assert.deepEqual(
      txns.map((t) => [t.category, t.category_normalized]),
      [
        ['bahan baku', 'Bahan Baku'],
        ['Insentif Fasilitas', 'Insentif & Fasilitas'],
        ['Lain-lain', null],
        ['Lain-lain', null],
      ],
    );
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.code, 'UNMAPPED_CATEGORY');
    assert.match(issues[0]!.message, /2 transaksi/);
  });
});

describe('SCRUM-43 internal transfers are not spend', () => {
  test('a petty-cash top-up pair: neither side counts as external spend', async () => {
    const { batch, detection } = await staged(
      withRows('sukun-cashflow.csv', [
        '1,TXN-K0001,22/02/2026,ISI KAS KECIL,KELUAR,Kas kecil,Isi kas kecil,Kas kecil,Petugas Keuangan,1,pax,Rp500.000,Rp500.000,Rp500.000,high,TERKONFIRMASI,',
        '2,TXN-K0002,22/02/2026,PENERIMAAN,MASUK,Kas kecil,Terima kas kecil,Kas kecil,Petugas Keuangan,1,pax,Rp500.000,Rp500.000,Rp500.000,high,TERKONFIRMASI,',
        '3,TXN-B0009,22/02/2026,BELANJA,KELUAR,Bahan Baku,Beli beras,Beras,Supplier A,10,kg,Rp12.000,Rp120.000,Rp120.000,high,TERKONFIRMASI,',
      ]),
      'CASHFLOW',
    );
    assert.ok(detection.ok);
    const txns = detection.profile.apply(batch.sheets, batch.rows, detection.profile).records as CashflowTxn[];
    assert.deepEqual(
      txns.map((t) => [t.txn_id, t.is_internal_transfer, t.is_external_spend]),
      [
        ['TXN-K0001', true, false],
        ['TXN-K0002', false, false],
        ['TXN-B0009', false, true],
      ],
    );
  });
});

describe('SCRUM-84/119 Ringkasan_Transaksi reconciliation', () => {
  test('matching summary: no issues, and it creates no transactions', () => {
    const txns = [txn('T1'), txn('T2', { txn_total: 2500 })];
    assert.deepEqual(reconcileRingkasan([ringkasan([['T1', 1000, 'TERKONFIRMASI'], ['T2', 2500, 'terkonfirmasi']])], txns), []);
    assert.equal(txns.length, 2);
  });

  test('missing ids, total and status gaps, and the grand-total gap are each reported', () => {
    const issues = reconcileRingkasan([ringkasan([['T1', 1500, 'PERLU_REVIEW'], ['T9', 10, 'TERKONFIRMASI']])], [txn('T1'), txn('T2')]);
    assert.deepEqual(issues.map((i) => i.code).sort(), ['RECON_STATUS_MISMATCH', 'RECON_SUM_MISMATCH', 'RECON_TOTAL_MISMATCH', 'RECON_TXN_MISSING', 'RECON_TXN_MISSING']);
  });

  test('a rounding difference of half a rupiah is not material', () => {
    assert.deepEqual(reconcileRingkasan([ringkasan([['T1', 1000.5, 'TERKONFIRMASI']])], [txn('T1')]), []);
  });

  test('no summary sheet is flagged, not silently passed', () => {
    assert.deepEqual(reconcileRingkasan([], [txn('T1')]).map((i) => i.code), ['RECON_NO_SUMMARY']);
  });
});

describe('SCRUM-48 vendor payment SLA', () => {
  const at = (s: string) => new Date(s);
  const times = (received: string, maker: string, approved: string, paid: string) => ({ receivedAt: at(received), makerInputAt: at(maker), approvedAt: at(approved), paidAt: at(paid) });

  test('same WIB day, next day, later', () => {
    assert.equal(classifySla(times('2026-03-02T01:00:00Z', '2026-03-02T02:00:00Z', '2026-03-02T03:00:00Z', '2026-03-02T09:00:00Z')), 'SAME_DAY');
    // 23:00 WIB received, 08:00 WIB next day paid.
    assert.equal(classifySla(times('2026-03-02T16:00:00Z', '2026-03-02T16:30:00Z', '2026-03-02T17:00:00Z', '2026-03-03T01:00:00Z')), 'D_PLUS_1');
    assert.equal(classifySla(times('2026-03-02T01:00:00Z', '2026-03-02T02:00:00Z', '2026-03-03T03:00:00Z', '2026-03-05T01:00:00Z')), 'BREACH');
  });

  test('out-of-order steps are invalid; a missing step is unknown, never on time', () => {
    assert.equal(classifySla(times('2026-03-02T05:00:00Z', '2026-03-02T02:00:00Z', '2026-03-02T06:00:00Z', '2026-03-02T07:00:00Z')), 'INVALID_SEQUENCE');
    assert.equal(classifySla({ receivedAt: null, makerInputAt: null, approvedAt: null, paidAt: at('2026-03-02T07:00:00Z') }), 'UNKNOWN');
  });
});
