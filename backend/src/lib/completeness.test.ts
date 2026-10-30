import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { kitchenCompleteness, type BatchRow } from './completeness.js';

const batch = (domain: BatchRow['domain'], status: BatchRow['status'], day = 1): BatchRow => ({
  domain,
  status,
  uploadDate: new Date(Date.UTC(2026, 10, day)),
  publishedAt: status === 'PUBLISHED' ? new Date(Date.UTC(2026, 10, day)) : null,
});

describe('kitchenCompleteness', () => {
  test('is empty with nothing delivered', () => {
    const c = kitchenCompleteness({ batches: [], liveLabels: new Set() });
    assert.deepEqual([c.complete, c.sent, c.percent, c.lastPublish], [0, 0, 0, null]);
  });

  test('counts published as complete, unpublished as sent, and flags stuck batches', () => {
    const c = kitchenCompleteness({
      batches: [batch('CASHFLOW', 'PUBLISHED', 3), batch('RAB', 'NEEDS_REVIEW'), batch('PO', 'FAILED'), batch('INPUT_MAKER', 'PUBLISHED', 5)],
      liveLabels: new Set(['Saldo Rekening']),
    });
    assert.deepEqual([c.complete, c.sent, c.percent], [3, 4, 50]);
    assert.deepEqual(c.issues, { fix: 1, review: 1 });
    assert.deepEqual(c.lastPublish, { at: '2026-11-05', label: 'Pembayaran Supplier' });
  });

  test('ignores superseded batches', () => {
    const c = kitchenCompleteness({ batches: [batch('RAB', 'SUPERSEDED')], liveLabels: new Set() });
    assert.equal(c.sent, 0);
  });
});
