import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, staged, withRows } from '../ingest/fixtures.js';
import { PROFILES } from './profiles.js';
import type { CashflowTxn } from './sukun-cashflow.js';

const profile = PROFILES.find((p) => p.id === 'MAP-SKN-CF-001')!;

describe('MAP-SKN-CF-001 adapter (SCRUM-27/55)', () => {
  test('groups the flat baseline back into transactions and keeps the source totals', async () => {
    const { mapping } = await staged(fixture('sukun-cashflow.csv'), 'CASHFLOW');
    assert.ok(mapping);
    assert.equal(mapping.records, 15);
    // Σ `total` of each transaction once, as in the source.
    assert.deepEqual(mapping.totals, { KELUAR: 169058236, MASUK: 2000000 });
    assert.deepEqual(mapping.issueCounts, { MISSING_AMOUNT: 5, NO_TXN_ID: 3, NEEDS_REVIEW: 4 });
  });

  test('Rupiah with thousand dots, decimal-comma qty, folded type/direction/unit', async () => {
    const { batch, mapping } = await staged(
      withRows('sukun-cashflow.csv', [
        '1,TXN-X1,05/03/2026,belanja,keluar,Bahan Baku,Uraian,Ayam,Supplier A,"7,75",KG,Rp40.000,Rp310.000,Rp327.000,high,TERKONFIRMASI,',
        '2,TXN-X1,05/03/2026,BELANJA,KELUAR,Bahan Baku,Uraian,Garam,Supplier A,1,pcs,17000,Rp17.000,Rp327.000,high,TERKONFIRMASI,',
      ]),
      'CASHFLOW',
    );
    const [txn] = profile.apply(batch.sheets, batch.rows, profile).records as CashflowTxn[];
    assert.ok(txn);
    assert.equal(txn.txn_date, '2026-03-05');
    assert.equal(txn.txn_type, 'BELANJA');
    assert.equal(txn.direction, 'KELUAR');
    assert.equal(txn.txn_total, 327000);
    assert.deepEqual(
      txn.lines.map((l) => [l.qty, l.unit, l.unit_price, l.line_amount]),
      [
        [7.75, 'kg', 40000, 310000],
        [1, 'pcs', 17000, 17000],
      ],
    );
    assert.deepEqual(mapping?.issues, []);
    // Each clean-up is logged once per field with its first example; values already clean ("17000", "BELANJA") are not.
    const n = Object.fromEntries(mapping!.normalized.map((x) => [`${x.code}:${x.field}`, [x.count, x.example.raw, x.example.value]]));
    assert.deepEqual(n['CURRENCY_PARSED:unit_price'], [1, 'Rp40.000', 40000]);
    assert.deepEqual(n['CURRENCY_PARSED:txn_total'], [2, 'Rp327.000', 327000]);
    assert.deepEqual(n['NUMBER_PARSED:qty'], [1, '7,75', 7.75]);
    assert.deepEqual(n['CASE_FOLDED:txn_type'], [1, 'belanja', 'BELANJA']);
    assert.deepEqual(n['CASE_FOLDED:unit'], [1, 'KG', 'kg']);
    assert.deepEqual(n['DATE_PARSED:txn_date'], [1, '05/03/2026', '2026-03-05']);
    assert.deepEqual(n['LINES_GROUPED:txn_id'], [1, '2 baris item', '1 transaksi']);
    assert.equal(n['CASE_FOLDED:review_status'], undefined);
  });

  test('lines that do not add up, or disagree on the total, are reported, not fixed', async () => {
    const { mapping } = await staged(
      withRows('sukun-cashflow.csv', [
        '1,TXN-X2,05/03/2026,BELANJA,KELUAR,Bahan Baku,U,Ayam,S,1,kg,Rp40.000,Rp40.000,Rp50.000,high,TERKONFIRMASI,',
        '2,TXN-X2,05/03/2026,BELANJA,KELUAR,Bahan Baku,U,Garam,S,1,kg,Rp5.000,Rp5.000,Rp45.000,high,TERKONFIRMASI,',
      ]),
      'CASHFLOW',
    );
    assert.deepEqual(mapping?.issueCounts, { TOTAL_INCONSISTENT: 1, LINES_NOT_TOTAL: 1 });
    assert.match(mapping!.issues[1]!.message, /TXN-X2: jumlah baris Rp45\.000 ≠ total Rp50\.000/);
  });
});

describe('DQ rule ids on issues', () => {
  test('PERLU_REVIEW keeps its note and names DQ-025', async () => {
    const { batch } = await staged(
      withRows('sukun-cashflow.csv', ['1,TXN-R1,05/03/2026,BELANJA,KELUAR,Bahan Baku,Uraian,Ayam,Supplier A,1,kg,1000,1000,1000,High,PERLU_REVIEW,cek nota']),
      'CASHFLOW',
    );
    const out = profile.apply(batch.sheets, batch.rows, profile);
    const issue = out.issues.find((i) => i.code === 'NEEDS_REVIEW' && i.message.startsWith('TXN-R1'));
    assert.equal(issue?.rule, 'DQ-025');
    assert.match(issue?.message ?? '', /cek nota/);
    assert.equal((out.records as CashflowTxn[]).find((t) => t.txn_id === 'TXN-R1')?.confidence, 'high');
  });
});

describe('external spend (PRD §7.4)', () => {
  test('petty cash coming in is not external spend', async () => {
    const { batch } = await staged(
      withRows('sukun-cashflow.csv', [
        '1,TXN-P1,05/03/2026,PENERIMAAN,MASUK,Operasional,Petty Cash,Petty Cash,Firli,1,pax,Rp2.000.000,Rp2.000.000,Rp2.000.000,high,TERKONFIRMASI,',
        '2,TXN-B1,05/03/2026,BELANJA,KELUAR,Bahan Baku,Ayam,Ayam,Supplier A,1,kg,Rp40.000,Rp40.000,Rp40.000,high,TERKONFIRMASI,',
      ]),
      'CASHFLOW',
    );
    const txns = profile.apply(batch.sheets, batch.rows, profile).records as CashflowTxn[];
    assert.deepEqual(txns.map((x) => [x.txn_id, x.is_external_spend]), [['TXN-P1', false], ['TXN-B1', true]]);
  });
});

describe('MAP-LWG-CF-001 (SCRUM-32/56)', () => {
  test('Lawang uses the same canonical columns and is detected by kitchen code', async () => {
    const { detection, mapping } = await staged(fixture('sukun-cashflow.csv'), 'CASHFLOW', 'LWG');
    assert.ok(detection.ok);
    assert.equal(detection.profile.id, 'MAP-LWG-CF-001');
    assert.equal(mapping?.profileId, 'MAP-LWG-CF-001');
  });
});

describe('anti-double-count (SCRUM-41, DQ PRD §7.4)', () => {
  const multiLine = withRows('sukun-cashflow.csv', [
    '1,TXN-X1,05/03/2026,BELANJA,KELUAR,Bahan Baku,Uraian,Ayam,Supplier A,1,kg,Rp300.000,Rp300.000,Rp327.000,high,TERKONFIRMASI,',
    '2,TXN-X1,05/03/2026,BELANJA,KELUAR,Bahan Baku,Uraian,Garam,Supplier A,1,pcs,Rp27.000,Rp27.000,Rp327.000,high,TERKONFIRMASI,',
    '3,TXN-X1,05/03/2026,BELANJA,KELUAR,Bahan Baku,Uraian,Merica,Supplier A,1,pcs,Rp0,Rp0,Rp327.000,high,TERKONFIRMASI,',
  ]);

  test('a three-line BELANJA counts its total once: header total = Σ line_amount, not 3 × total', async () => {
    const { batch, mapping } = await staged(multiLine, 'CASHFLOW');
    const [txn] = profile.apply(batch.sheets, batch.rows, profile).records as CashflowTxn[];
    assert.ok(txn);
    assert.equal(txn.lines.length, 3);
    assert.equal(txn.txn_total, 327000);
    assert.equal(txn.lines.reduce((n, l) => n + (l.line_amount ?? 0), 0), 327000);
    // The mistake the rule guards against: summing the repeated source total per row.
    assert.notEqual(txn.lines.length * 327000, mapping?.totals.KELUAR);
    assert.deepEqual(mapping?.totals, { KELUAR: 327000 });
  });

  test('a total that differs between the lines of one transaction is flagged', async () => {
    const { mapping } = await staged(
      withRows('sukun-cashflow.csv', [
        '1,TXN-X2,05/03/2026,BELANJA,KELUAR,Bahan Baku,Uraian,Ayam,Supplier A,1,kg,Rp300.000,Rp300.000,Rp327.000,high,TERKONFIRMASI,',
        '2,TXN-X2,05/03/2026,BELANJA,KELUAR,Bahan Baku,Uraian,Garam,Supplier A,1,pcs,Rp27.000,Rp27.000,Rp654.000,high,TERKONFIRMASI,',
      ]),
      'CASHFLOW',
    );
    assert.equal(mapping?.issueCounts.TOTAL_INCONSISTENT, 1);
  });
});
