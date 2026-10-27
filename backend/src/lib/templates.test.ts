import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildTemplate } from './templates.js';
import { PROFILES } from './mapping/profiles.js';

async function open(kind: 'cashflow' | 'menu') {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await buildTemplate(kind));
  return wb;
}

describe('official templates (SCRUM-130/125)', () => {
  test('cashflow: required sheets, profile headers, no data rows, dropdowns, version', async () => {
    const wb = await open('cashflow');
    assert.deepEqual(wb.worksheets.map((s) => s.name), ['Transaksi_Kas', 'Ringkasan_Transaksi', 'Referensi', 'Legenda_Kolom']);
    const ws = wb.getWorksheet('Transaksi_Kas')!;
    const profile = PROFILES.find((p) => p.id === 'MAP-SKN-CF-001')!;
    assert.deepEqual((ws.getRow(1).values as string[]).slice(1), Object.values(profile.columns));
    assert.equal(ws.rowCount, 1);
    assert.equal(ws.getCell("D2").dataValidation?.type, "list");
    assert.match(String(wb.keywords), /cashflow-v1/);
  });

  test('menu: sheets Menu, Referensi, Legenda_Kolom', async () => {
    const wb = await open('menu');
    assert.deepEqual(wb.worksheets.map((s) => s.name), ['Menu', 'Referensi', 'Legenda_Kolom']);
  });
});
