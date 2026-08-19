import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseMenuWorkbook } from './menu-workbook.js';

const HEADERS = [
  'Tanggal',
  'Hari',
  'Jenis Menu',
  'Kelompok Porsi',
  'Menu',
  'Bahan',
  'Berat Bersih',
  'Berat Kotor',
  'BDD',
  'Energi',
  'Protein',
  'Lemak',
  'Karbohidrat',
  'Jumlah PM',
];

const ROW = [
  new Date('2026-08-03'),
  'Senin',
  'Basah',
  'Busui & Bumil',
  'Ayam Goreng Lengkuas',
  'Ayam',
  75,
  100,
  75,
  180.5,
  16.2,
  11.4,
  0,
  240,
];

async function build(rows: unknown[][], headers: string[] = HEADERS): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Menu');
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
}

describe('parseMenuWorkbook (SCRUM-6)', () => {
  test('maps a clean sheet onto menu_plans columns', async () => {
    const { rows, errors, columns } = await parseMenuWorkbook(await build([ROW]));

    assert.deepEqual(errors, []);
    assert.equal(rows.length, 1);
    assert.deepEqual(columns, HEADERS);

    const row = rows[0]!;
    assert.equal(row.menuName, 'Ayam Goreng Lengkuas');
    assert.equal(row.menuType, 'BASAH');
    // The enum cannot hold "&" or a space, so the label has to be translated.
    assert.equal(row.portionClass, 'BUSUI_BUMIL');
    assert.equal(row.beratBersih, 75);
    assert.equal(row.jumlahPm, 240);
    // Columns absent from the sheet stay undefined rather than becoming 0.
    assert.equal(row.serat, undefined);
    assert.equal(row.hargaBahan, undefined);
  });

  test('header matching ignores case, punctuation and a trailing unit', async () => {
    const relabelled = [...HEADERS];
    relabelled[6] = 'BERAT BERSIH (g)';
    relabelled[8] = 'bdd_%';

    const { rows, errors } = await parseMenuWorkbook(await build([ROW], relabelled));

    assert.deepEqual(errors, []);
    assert.equal(rows[0]?.beratBersih, 75);
    assert.equal(rows[0]?.bdd, 75);
  });

  test('a missing required column stops the import instead of importing partly', async () => {
    const without = HEADERS.filter((h) => h !== 'Jumlah PM');
    const { rows, errors } = await parseMenuWorkbook(
      await build([ROW.slice(0, 13)], without),
    );

    assert.equal(rows.length, 0);
    assert.match(errors[0]!, /missing required column\(s\): Jumlah PM/);
  });

  test('a bad cell is reported with its row number and column name', async () => {
    const bad = [...ROW];
    bad[9] = 'bukan angka'; // Energi

    const { errors } = await parseMenuWorkbook(await build([ROW, bad]));

    assert.equal(errors.length, 1);
    assert.match(errors[0]!, /^row 3: Energi — /);
  });

  test('an unknown portion class is rejected, not silently dropped', async () => {
    const bad = [...ROW];
    bad[3] = 'Remaja';

    const { errors } = await parseMenuWorkbook(await build([bad]));

    assert.match(errors[0]!, /Kelompok Porsi/);
  });

  test('blank trailing rows are not errors', async () => {
    const { rows, errors } = await parseMenuWorkbook(await build([ROW, [], []]));

    assert.deepEqual(errors, []);
    assert.equal(rows.length, 1);
  });

  test('a file that is not a workbook fails as a format error, not a crash', async () => {
    const { rows, errors } = await parseMenuWorkbook(Buffer.from('this is not xlsx'));

    assert.equal(rows.length, 0);
    assert.deepEqual(errors, ['file is not a readable .xlsx workbook']);
  });
});
