import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { PrismaStagingRepository, type StagedBatch, type StagingRow } from './staging.js';

const row = (n: number): StagingRow => ({
  uploadBatchId: 'b-1',
  sourceRecordId: `SKN:MENU:abc:Menu:${n}`,
  kitchenId: 'SKN',
  sourceSystem: 'INTERNAL',
  sourceFileName: 'menu.csv',
  templateVersion: null,
  mappingProfileId: null,
  loadedAt: new Date('2026-10-26T00:00:00Z'),
  sheetName: 'Menu',
  sourceRowNumber: n,
  cells: { A: { value: '31,25', type: 'string' } },
});

/** Records calls and keeps rows in an array, like staging_rows would. */
function fakeDb() {
  const table: Record<string, unknown>[] = [];
  const calls: string[] = [];
  const stagingRow = {
    deleteMany: async ({ where }: { where: { uploadBatchId: string } }) => {
      calls.push('delete');
      for (let i = table.length - 1; i >= 0; i--) if (table[i].uploadBatchId === where.uploadBatchId) table.splice(i, 1);
    },
    createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
      calls.push(`create:${data.length}`);
      table.push(...data.map((d, i) => ({ id: BigInt(table.length + i + 1), ...d })));
    },
    findMany: async ({ where }: { where: { uploadBatchId: string } }) => table.filter((r) => r.uploadBatchId === where.uploadBatchId),
  };
  const db = { stagingRow, $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ stagingRow }) } as unknown as PrismaClient;
  return { db, calls, table };
}

describe('PrismaStagingRepository (SCRUM-24)', () => {
  const batch = (n: number): StagedBatch => ({ domain: 'MENU', sheets: [], rows: Array.from({ length: n }, (_, i) => row(i + 2)) });

  test('replace deletes first, so a re-parse leaves no stale rows (idempotent)', async () => {
    const { db, calls, table } = fakeDb();
    const repo = new PrismaStagingRepository(db);
    await repo.replaceBatch('b-1', batch(3));
    await repo.replaceBatch('b-1', batch(2));
    assert.equal(table.length, 2);
    assert.deepEqual(calls, ['delete', 'create:3', 'delete', 'create:2']);
  });

  test('large batches are written in chunks', async () => {
    const { db, calls } = fakeDb();
    await new PrismaStagingRepository(db).replaceBatch('b-1', batch(4500));
    assert.deepEqual(calls.filter((c) => c.startsWith('create')), ['create:2000', 'create:2000', 'create:500']);
  });

  test('raw cells and the domain round-trip; unknown batch is undefined', async () => {
    const { db } = fakeDb();
    const repo = new PrismaStagingRepository(db);
    await repo.replaceBatch('b-1', batch(1));
    const got = await repo.getBatch('b-1');
    assert.equal(got?.domain, 'MENU');
    assert.equal(got?.rows[0].cells.A.value, '31,25');
    assert.equal(await repo.getBatch('nope'), undefined);
  });
});
