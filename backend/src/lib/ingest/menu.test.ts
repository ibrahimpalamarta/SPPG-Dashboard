import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseToStaging } from './pipeline.js';
import { InMemoryStagingRepository, type ParseContext } from './staging.js';
import { fixture } from './fixtures.js';

const ctx: ParseContext = {
  uploadBatchId: 'menu-1',
  kitchenCode: 'SKN',
  domain: 'MENU',
  sourceSystem: 'INTERNAL',
  sourceFileName: 'Copy of [SKN] MASTER DATA MENU - SUKUN.xlsx - 12.csv',
  fileHash: 'fedcba9876543210',
  loadedAt: new Date('2026-10-25T00:00:00Z'),
};

describe('menuParser (SCRUM-36)', () => {
  test('stages every row of the 23-column Sukun menu; row count equals the source', async () => {
    const out = await parseToStaging(fixture('sukun-menu.csv'), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const [sheet] = out.batch.sheets;
    assert.equal(Object.keys(sheet.headers).length, 23);
    assert.equal(sheet.rowCount, 22);
    assert.equal(out.batch.rows.length, 22);
  });

  test('raw values are untouched: decimal comma, thousands, URT serial, trailing spaces', async () => {
    const out = await parseToStaging(fixture('sukun-menu.csv'), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const acar = out.batch.rows.find((r) => r.cells.G?.value === 'Acar')!;
    assert.equal(acar.cells.I.value, '31,25');
    assert.equal(acar.cells.F.value, 'kecil');
    const krimer = out.batch.rows.find((r) => r.cells.H?.value === 'Krimer')!;
    assert.equal(krimer.cells.L.value, '46024');
    const pisang = out.batch.rows.find((r) => r.cells.F?.value === 'Besar ')!;
    assert.equal(pisang.cells.T.value, '1,570.00');
    const nasi = out.batch.rows.find((r) => r.cells.C?.value === '08/04/2026')!;
    assert.equal(nasi.cells.O, undefined, 'missing protein stays missing');
  });

  test('sheets without Tanggal/Porsi/Bahan are listed as skipped, not staged', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Rekap').addRow(['Bulan', 'Total']);
    wb.getWorksheet('Rekap')!.addRow(['Maret', 1000]);
    const menu = wb.addWorksheet('12');
    menu.addRow(['Sukun', 'Tanggal', 'Porsi', 'Bahan']);
    menu.addRow(['Sukun', '23/02/2026', 'Kecil', 'Susu']);
    const out = await parseToStaging(Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer), { ...ctx, sourceFileName: 'menu.xlsx' }, new InMemoryStagingRepository());
    assert.ok(out.ok);
    assert.match(out.batch.sheets[0].skipped!, /Bukan sheet data menu/);
    assert.deepEqual(out.batch.rows.map((r) => r.sheetName), ['12']);
  });

  test('a header-only menu template is EMPTY_FILE with nothing staged (SCRUM-131)', async () => {
    const header = fixture('sukun-menu.csv').toString('utf8').split('\n')[0];
    const repo = new InMemoryStagingRepository();
    const out = await parseToStaging(Buffer.from(`${header}\n`), ctx, repo);
    assert.equal(out.ok ? null : out.errorCode, 'EMPTY_FILE');
    assert.equal(await repo.getBatch(ctx.uploadBatchId), undefined);
  });
});
