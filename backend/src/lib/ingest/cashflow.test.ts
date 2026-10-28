import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseToStaging } from './pipeline.js';
import { InMemoryStagingRepository, type ParseContext } from './staging.js';
import { fixture } from './fixtures.js';

const ctx: ParseContext = {
  uploadBatchId: 'cf-1',
  kitchenCode: 'SKN',
  domain: 'CASHFLOW',
  sourceSystem: 'INTERNAL',
  sourceFileName: 'cashflow.xlsx',
  fileHash: '0123456789abcdef',
  loadedAt: new Date('2026-10-23T00:00:00Z'),
};

// Headers copied from the Sukun template (Kamus_Data); every value is invented.
const TXN_HEADER = ['txn_id', 'tanggal', 'no_bukti', 'tipe', 'arah', 'dana', 'akun_kas', 'kategori', 'uraian', 'pihak', 'bank', 'no_rekening', 'jumlah', 'bukti_checklist', 'link_invoice_pemasok', 'link_invoice_pembayaran', 'sumber', 'status_review'];
const LINE_HEADER = ['line_id', 'txn_id', 'no_bukti', 'tanggal', 'kategori', 'komponen', 'supplier', 'nama_barang', 'qty', 'satuan', 'harga_satuan', 'jumlah_baris', 'confidence', 'catatan_review'];

async function sukunWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Struktur').addRow(['Template Basis Data Arus Kas']);
  const kamus = wb.addWorksheet('Kamus_Data');
  kamus.addRow(['Sheet', 'Kolom', 'Tipe', 'Wajib']);
  kamus.addRow(['Transaksi_Kas', 'txn_id', 'text', 'ya']);

  const txn = wb.addWorksheet('Transaksi_Kas');
  txn.addRow(TXN_HEADER);
  // Day-only date, as some real rows have; amount as currency text.
  txn.addRow(['TXN-R001', 10, '1/RK/2026', 'PENERIMAAN', 'MASUK', 'Dana Bahan Baku', 'Kas di Bank', null, 'Terima dana', 'Internal', null, null, 'Rp65,000', true, null, null, 'LAPKEU-Transaksi', 'TERKONFIRMASI']);
  txn.addRow(['TXN-B001', '11/05/2026', '…/1', 'BELANJA', 'KELUAR', 'Dana Bahan Baku', 'Kas di Bank', 'Bahan Baku', 'Beli beras & telur', 'Toko Contoh', 'Bank X', '0000000000', '1,250,000', true, null, null, 'Input Maker', 'DRAFT']);
  // Duplicate txn_id stays two rows: dedup is publish's job, not staging's.
  txn.addRow(['TXN-B001', '11/05/2026', '…/1', 'BELANJA', 'KELUAR', 'Dana Bahan Baku', 'Kas di Bank', 'Bahan Baku', 'Beli beras & telur', 'Toko Contoh', 'Bank X', '0000000000', '1,250,000', true, null, null, 'Input Maker', 'DRAFT']);

  const lines = wb.addWorksheet('Rincian_Belanja');
  lines.addRow(LINE_HEADER);
  lines.addRow(['LN-0001', 'TXN-B001', '…/1', '11/05/2026', 'Bahan Baku', 'Nasi', 'Toko Contoh', 'beras', 3, 'sak', '350000', '1050000', 'high', null]);
  // Decimal comma and a missing harga_satuan on the second line of the same txn.
  lines.addRow(['LN-0002', 'TXN-B001', '…/1', '11/05/2026', 'Bahan Baku', 'Lauk', 'Toko Contoh', 'telur', '12,5', 'kg', null, null, 'low', 'multi-item — verifikasi']);

  const hr = wb.addWorksheet('Insentif_Penggajian');
  hr.addRow(['row_id', 'txn_id', 'tipe', 'posisi', 'nama', 'no_rekening', 'bank_atas_nama', 'periode', 'nominal']);
  hr.addRow(['HR-001', 'TXN-P001', 'RELAWAN', 'Asisten', 'Nama Contoh', '0000000000', 'Nama Contoh', '11–23 Mei 2026', '1,600,000']);

  wb.addWorksheet('Ref_Supplier').addRow(['nama_supplier', 'bank', 'no_rekening']);
  return Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
}

describe('cashflowParser (SCRUM-35)', () => {
  test('stages Transaksi_Kas and Rincian_Belanja; row count equals the source', async () => {
    const out = await parseToStaging(await sukunWorkbook(), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const bySheet = Object.fromEntries(out.batch.sheets.map((s) => [s.name, s.rowCount]));
    assert.deepEqual(bySheet, { Struktur: 0, Kamus_Data: 0, Transaksi_Kas: 3, Rincian_Belanja: 2, Insentif_Penggajian: 0, Ref_Supplier: 0 });
    assert.equal(out.batch.rows.length, 5);
  });

  test('never copies the per-person pay sheet, and says why', async () => {
    const out = await parseToStaging(await sukunWorkbook(), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const hr = out.batch.sheets.find((s) => s.name === 'Insentif_Penggajian')!;
    assert.match(hr.skipped!, /Data pribadi/);
    assert.equal(out.batch.rows.some((r) => r.sheetName === 'Insentif_Penggajian'), false);
    assert.equal(JSON.stringify(out.batch.rows).includes('Nama Contoh'), false);
  });

  test('skips the Ringkasan_Transaksi rollup even though it carries txn_id', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Transaksi_Kas').addRow(['id', 'txn_id']).worksheet.addRow(['L1', 'T1']);
    wb.addWorksheet('Ringkasan_Transaksi').addRow(['txn_id', 'total']).worksheet.addRow(['T1', 10]);
    const out = await parseToStaging(Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    assert.match(out.batch.sheets.find((s) => s.name === 'Ringkasan_Transaksi')!.skipped!, /Ringkasan/);
    assert.equal(out.batch.rows.length, 1);
  });

  test('raw values are identical to the source: no currency, decimal or date normalisation', async () => {
    const out = await parseToStaging(await sukunWorkbook(), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const [r001] = out.batch.rows;
    assert.deepEqual(r001.cells.M, { value: 'Rp65,000', type: 'string' });
    assert.deepEqual(r001.cells.B, { value: 10, type: 'number' }, 'day-only date kept as written');
    assert.equal(r001.cells.H, undefined, 'empty kategori is missing, not 0 or ""');

    const ln2 = out.batch.rows.find((r) => r.cells.A?.value === 'LN-0002')!;
    assert.deepEqual(ln2.cells.I, { value: '12,5', type: 'string' });
    assert.equal(ln2.cells.K, undefined);
  });

  test('a duplicated transaction stays two staged rows with distinct source ids', async () => {
    const out = await parseToStaging(await sukunWorkbook(), ctx, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const dupes = out.batch.rows.filter((r) => r.sheetName === 'Transaksi_Kas' && r.cells.A?.value === 'TXN-B001');
    assert.equal(dupes.length, 2);
    assert.notEqual(dupes[0].sourceRecordId, dupes[1].sourceRecordId);
  });

  test("tolerates Donomulyo's single-sheet layout without a kitchen branch", async () => {
    const wb = new ExcelJS.Workbook();
    const s = wb.addWorksheet('Transaksi Kas');
    s.addRow(['id', 'txn_id', 'tanggal', 'tipe', 'arah', 'kategori', 'uraian', 'nama_barang', 'nama_penerima', 'qty', 'satuan', 'harga_satuan', 'jumlah_baris', 'total', 'confidence', 'status_review', 'catatan_review']);
    s.addRow([1, 'T-1', '01/09/2026', 'BELANJA', 'KELUAR', 'Bahan Baku', 'Belanja', 'beras', 'Toko', 2, 'Kg', 'Rp15,000', 'Rp30,000', 'Rp2,700,000', 'high', 'DRAFT', null]);
    const buf = Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);

    const out = await parseToStaging(buf, { ...ctx, kitchenCode: 'DNM' }, new InMemoryStagingRepository());
    assert.ok(out.ok);
    assert.equal(out.batch.rows.length, 1);
    assert.equal(out.batch.rows[0].cells.N.value, 'Rp2,700,000');
  });

  test('a cashflow file with no txn_id sheet is EMPTY_FILE, not a silent success', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Sheet1').addRow(['Tanggal', 'Keterangan']).commit();
    wb.getWorksheet('Sheet1')!.addRow(['01/09/2026', 'x']);
    const out = await parseToStaging(Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer), ctx, new InMemoryStagingRepository());
    assert.equal(out.ok ? null : out.errorCode, 'EMPTY_FILE');
  });
});

describe('cashflowParser on the Sukun baseline layout (SCRUM-35)', () => {
  const csv = { ...ctx, sourceFileName: 'CASHFLOW_SUKUN - Transaksi_Kas.csv' };

  test('the flat Transaksi_Kas export stages every non-blank row, id-less ones included', async () => {
    const out = await parseToStaging(fixture('sukun-cashflow.csv'), csv, new InMemoryStagingRepository());
    assert.ok(out.ok);
    // 38 data lines; the last line of the file is entirely blank and carries nothing.
    assert.equal(out.batch.rows.length, 38);
    const noTxn = out.batch.rows.filter((r) => r.cells.B === undefined);
    assert.equal(noTxn.length, 3, 'rows without txn_id are staged for the profile to flag, not dropped');
  });

  test('multi-line transactions keep the repeated total on every line, untouched', async () => {
    const out = await parseToStaging(fixture('sukun-cashflow.csv'), csv, new InMemoryStagingRepository());
    assert.ok(out.ok);
    const lines = out.batch.rows.filter((r) => r.cells.B?.value === 'TXN-B0050');
    assert.deepEqual(lines.map((r) => r.cells.N.value), ['Rp3.373.000', 'Rp3.373.000', 'Rp3.373.000', 'Rp3.373.000']);
  });
});
