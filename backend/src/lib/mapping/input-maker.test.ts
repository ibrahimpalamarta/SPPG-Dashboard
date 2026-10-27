import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { staged } from '../ingest/fixtures.js';
import { PROFILES } from './profiles.js';
import type { InputMakerLine } from './input-maker.js';

const csv = Buffer.from(
  [
    'NO,TANGGAL,KETERANGAN,Kategori,Nama Supplier,NOMER REKENING,REKENING A.N,TAGIHAN,Checklist,Link Invoice Pemasok,Link Invoice Pembayaran',
    '1,05/03/2026,Beras 50 kg,Bahan Baku,UD Maju,1234567890,Budi,Rp1.500.000,TRUE,https://x/inv1,',
    '2,06/03/2026,Gas LPG,Operasional,PT Gas,0987654321,Sari,,FALSE,,',
  ].join('\n'),
);

describe('Input Maker (SCRUM-86/118)', () => {
  test('stages raw rows without bank columns and maps TAGIHAN as requested, not paid', async () => {
    const { batch, detection, mapping } = await staged(csv, 'INPUT_MAKER');
    assert.ok(detection.ok);
    assert.equal(batch.rows.length, 2);
    const cells = batch.rows.flatMap((r) => Object.values(r.cells).map((c) => String(c.value)));
    for (const secret of ['1234567890', '0987654321', 'Budi', 'Sari']) assert.ok(!cells.includes(secret));
    assert.deepEqual(mapping?.totals, { TAGIHAN: 1500000 });
    assert.deepEqual(mapping?.issueCounts, { MISSING_AMOUNT: 1 });
    const profile = PROFILES.find((p) => p.id === 'MAP-SKN-PAY-001')!;
    const [first] = profile.apply(batch.sheets, batch.rows, profile).records as InputMakerLine[];
    assert.equal(first?.request_date, '2026-03-05');
    assert.equal(first?.request_amount, 1500000);
    assert.equal(first?.checklist, true);
  });
});
