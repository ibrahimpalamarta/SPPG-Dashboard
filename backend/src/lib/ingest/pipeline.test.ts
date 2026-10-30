import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { parseToStaging } from './pipeline.js';
import { InMemoryStagingRepository, sourceRecordId, type ParseContext } from './staging.js';

const ctx: ParseContext = {
  uploadBatchId: 'b-1',
  kitchenCode: 'SKN',
  domain: 'PO',
  sourceSystem: 'INTERNAL',
  sourceFileName: 'rab.xlsx',
  fileHash: 'abcdef0123456789',
  loadedAt: new Date('2026-10-23T00:00:00Z'),
};

async function toBuffer(wb: ExcelJS.Workbook) {
  return Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
}

/** Title row above the header, a formula, a date, a merged cell, a blank row,
 * and a second sheet that is only notes. */
async function multiSheet() {
  const wb = new ExcelJS.Workbook();
  const rab = wb.addWorksheet('RAB Oktober');
  rab.addRow(['Budget and realization']);
  rab.addRow(['Tanggal', 'Bahan', 'Qty', 'Harga', 'Total']);
  rab.addRow([new Date('2026-10-01'), 'Beras', 10, 'Rp12,000', { formula: 'C3*1000', result: 10000 }]);
  rab.addRow([]);
  rab.addRow([new Date('2026-10-02'), 'Telur', null, null, null]);
  rab.mergeCells('B5:C5');
  const notes = wb.addWorksheet('Catatan');
  notes.addRow(['baris catatan']);
  return toBuffer(wb);
}

describe('parseToStaging (SCRUM-24)', () => {
  test('reads every sheet in order and stages only data rows below the header', async () => {
    const staging = new InMemoryStagingRepository();
    const out = await parseToStaging(await multiSheet(), ctx, staging);
    assert.ok(out.ok);

    assert.deepEqual(out.batch.sheets.map((s) => [s.name, s.index, s.headerRow, s.rowCount]), [
      ['RAB Oktober', 1, 2, 2],
      ['Catatan', 2, null, 0],
    ]);
    assert.deepEqual(out.batch.sheets[0].headers, { A: 'Tanggal', B: 'Bahan', C: 'Qty', D: 'Harga', E: 'Total' });
    assert.deepEqual(out.batch.rows.map((r) => r.sourceRowNumber), [3, 5], 'blank row 4 skipped');
  });

  test('keeps raw values: currency text untouched, formula result + text, date + serial, empty stays NULL', async () => {
    const out = await parseToStaging(await multiSheet(), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const [first, second] = out.batch.rows;

    assert.deepEqual(first.cells.D, { value: 'Rp12,000', type: 'string' });
    assert.deepEqual(first.cells.E, { value: 10000, type: 'number', formula: 'C3*1000' });
    assert.equal(first.cells.A.type, 'date');
    assert.equal(first.cells.A.dateSerial, 46296);
    assert.equal(second.cells.D, undefined, 'missing is absent, never 0');
    assert.equal(second.cells.C.mergedFrom, 'B5');
  });

  test('source_record_id is deterministic and carries the traceability fields', async () => {
    const out = await parseToStaging(await multiSheet(), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const row = out.batch.rows[0];
    assert.equal(row.sourceRecordId, 'SKN:PO:abcdef012345:RAB%20Oktober:3');
    assert.equal(row.sourceRecordId, sourceRecordId('SKN', 'PO', ctx.fileHash, 'RAB Oktober', 3));
    assert.equal(row.sourceSystem, 'INTERNAL');
    assert.equal(row.sourceFileName, 'rab.xlsx');
    assert.equal(row.templateVersion, null);
  });

  test('re-parsing the same batch replaces its rows instead of appending', async () => {
    const staging = new InMemoryStagingRepository();
    const buf = await multiSheet();
    await parseToStaging(buf, ctx, staging);
    await parseToStaging(buf, ctx, staging);
    assert.equal((await staging.getBatch('b-1'))?.rows.length, 2);
  });

  test('a workbook with no data rows fails as EMPTY_FILE and clears earlier staging', async () => {
    const staging = new InMemoryStagingRepository();
    await parseToStaging(await multiSheet(), ctx, staging);

    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Kosong').addRow(['Tanggal', 'Bahan']);
    const out = await parseToStaging(await toBuffer(wb), ctx, staging);

    assert.deepEqual(out.ok ? null : out.errorCode, 'EMPTY_FILE');
    assert.equal(await staging.getBatch('b-1'), undefined);
  });
});

describe('parseToStaging columnMap (Ubah Mapping)', () => {
  const fixtureCsv = () => readFileSync(new URL('./fixtures/sukun-cashflow.csv', import.meta.url));
  const csv = Buffer.from(fixtureCsv().toString('utf8').replace(',tanggal,', ',tgl,'));
  const cashflow: ParseContext = { ...ctx, domain: 'CASHFLOW', sourceFileName: 'cashflow.csv' };

  test('an unknown header is unmatched until the uploader points it at an SOP field', async () => {
    const before = await parseToStaging(csv, cashflow, new InMemoryStagingRepository());
    assert.ok(before.ok && !before.detection.ok);
    const tgl = before.columns.find((c) => c.header === 'tgl')!;
    assert.equal(tgl.field, null);
    assert.ok(before.fields.some((f) => f.field === 'txn_date' && f.header === 'tanggal'));

    const after = await parseToStaging(csv, { ...cashflow, columnMap: { [`${tgl.sheet}|${tgl.column}`]: 'txn_date' } }, new InMemoryStagingRepository());
    assert.ok(after.ok && after.detection.ok);
    assert.deepEqual(after.columns.find((c) => c.column === tgl.column), { ...tgl, field: 'txn_date' }, 'still shows the file\'s own header');
  });

  test('"" marks a matched column as not used, which makes the file unrecognised', async () => {
    const ok = await parseToStaging(fixtureCsv(), cashflow, new InMemoryStagingRepository());
    assert.ok(ok.ok && ok.detection.ok);
    const id = ok.columns.find((c) => c.header === 'id')!;
    const out = await parseToStaging(fixtureCsv(), { ...cashflow, columnMap: { [`${id.sheet}|${id.column}`]: '' } }, new InMemoryStagingRepository());
    assert.ok(out.ok && !out.detection.ok);
    assert.equal(out.columns.find((c) => c.column === id.column)!.field, null);
  });
});
