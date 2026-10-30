import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkUpload } from './upload-check.js';

const diff = [{ sheet: 'Transaksi_Kas', missing: ['jumlah_baris', 'kategori'], unexpected: ['jml baris'] }];
const answer = (o: unknown) => async () => `\`\`\`json\n${JSON.stringify(o)}\n\`\`\``;

describe('checkUpload (SCRUM-150)', () => {
  test('keeps readings that point at a missing column and drops invented ones', async () => {
    const out = await checkUpload(
      { columnDiff: diff, issueCounts: { MISSING_REQUIRED: 2 } },
      answer({
        columns: [
          { header: 'jml baris', readAs: 'jumlah_baris', reason: 'singkatan' },
          { header: 'x', readAs: 'bukan_kolom', reason: 'tebakan' },
        ],
        issues: [
          { code: 'MISSING_REQUIRED', advice: 'Isi kolom wajib.' },
          { code: 'TIDAK_ADA', advice: 'dikarang' },
        ],
      }),
      true,
    );
    assert.deepEqual(out?.columns.map((c) => c.readAs), ['jumlah_baris', null]);
    assert.deepEqual(out?.issues.map((i) => i.code), ['MISSING_REQUIRED']);
  });

  test('sends header names and issue codes, never a value', async () => {
    let prompt = '';
    await checkUpload({ columnDiff: diff, issueCounts: { MISSING_REQUIRED: 2 } }, async (_s, p) => ((prompt = p), '{}'), true);
    assert.equal(prompt, 'Sheet Transaksi_Kas: hilang [jumlah_baris; kategori], tidak dikenal [jml baris]\nMasalah MISSING_REQUIRED: 2x');
  });

  test('null when disabled, when there is nothing to ask, and when the model fails or rambles', async () => {
    const ask = answer({ columns: [], issues: [] });
    assert.equal(await checkUpload({ columnDiff: diff, issueCounts: {} }, ask, false), null);
    assert.equal(await checkUpload({ columnDiff: [], issueCounts: {} }, ask, true), null);
    assert.equal(await checkUpload({ columnDiff: diff, issueCounts: {} }, async () => Promise.reject(new Error('HTTP 500')), true), null);
    assert.equal(await checkUpload({ columnDiff: diff, issueCounts: {} }, async () => 'maaf', true), null);
  });
});
