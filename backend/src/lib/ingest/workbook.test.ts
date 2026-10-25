import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { WorkbookError, readWorkbook } from './workbook.js';
import { fixture } from './fixtures.js';

describe('readWorkbook CSV (SCRUM-24)', () => {
  test('every cell stays the string in the file: no number, currency or date guessing', async () => {
    const [sheet] = await readWorkbook(fixture('sukun-cashflow.csv'), 'Copy of [SKN] CASHFLOW_SUKUN.xlsx - Transaksi_Kas.csv');
    assert.equal(sheet.name, 'Transaksi_Kas', 'sheet named after the Google Sheets tab, brackets dropped');
    const row = sheet.rows.find((r) => r.cells.B?.value === 'TXN-B0001')!;
    assert.deepEqual(row.cells.A, { value: '1', type: 'string' });
    assert.deepEqual(row.cells.C, { value: '22/02/2026', type: 'string' });
    assert.deepEqual(row.cells.L, { value: 'Rp65.000', type: 'string' });
    const sla = sheet.rows.find((r) => r.cells.H?.value === 'Sla')!;
    assert.deepEqual(sla.cells.J, { value: '7,75', type: 'string' }, 'quoted decimal comma kept');
  });

  test('an empty CSV cell is missing, not "" or 0', async () => {
    const [sheet] = await readWorkbook(fixture('sukun-cashflow.csv'), 'x.csv');
    const bawang = sheet.rows.find((r) => r.cells.H?.value === 'Bawang Putih' && r.cells.B?.value === 'TXN-B0048')!;
    assert.equal(bawang.cells.J, undefined);
    assert.equal(bawang.cells.L, undefined);
  });

  test('a UTF-8 BOM does not end up in the first header', async () => {
    const [sheet] = await readWorkbook(Buffer.from('﻿txn_id,qty\nT-1,2\n'), 'x.csv');
    assert.equal(sheet.rows[0].cells.A.value, 'txn_id');
  });

  test('a binary file renamed to .csv is CORRUPT_FILE', async () => {
    await assert.rejects(readWorkbook(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]), 'x.csv'), (e: unknown) => e instanceof WorkbookError && e.code === 'CORRUPT_FILE');
  });
});
