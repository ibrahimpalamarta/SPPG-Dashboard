import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { Db } from '../../db.js';
import type { Role } from '../../auth/roles.js';
import { createUploadBatch, listUploadBatches, updateUploadBatch } from './upload-batch.js';

const userWith = (role: Role, scopeId: bigint | null = null): User =>
  ({ id: 1n, role, scopeId } as User);

const VALID_HASH = 'a'.repeat(64);

interface Captured {
  status?: number;
  body?: Record<string, unknown>;
  nexted: boolean;
}

async function run(handler: ReturnType<typeof createUploadBatch>, req: Partial<Request>) {
  const captured: Captured = { nexted: false };
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: unknown) {
      captured.body = payload as Record<string, unknown>;
      return this;
    },
  } as unknown as Response;

  await handler(req as Request, res, () => {
    captured.nexted = true;
  });
  return captured;
}

/** Records what the handler asked the database to do. */
function fakeDb(overrides: Partial<Record<string, unknown>> = {}) {
  const calls: { findManyWhere?: unknown; created?: unknown; updated?: unknown } = {};
  const db = {
    uploadBatch: {
      findMany: async (args: { where: unknown }) => {
        calls.findManyWhere = args.where;
        return [];
      },
      count: async () => 0,
      findUnique: async () => null,
      create: async (args: { data: unknown }) => {
        calls.created = args.data;
        return { id: 9n, ...(args.data as object) };
      },
      update: async (args: { data: unknown }) => {
        calls.updated = args.data;
        return { id: 9n, status: 'DITERIMA' };
      },
      ...overrides,
    },
    auditLog: { create: async () => ({}) },
  } as unknown as Db;

  return { db, calls };
}

describe('listUploadBatches (SCRUM-7)', () => {
  test('a DATA_ADMIN only ever queries its own dapur', async () => {
    const { db, calls } = fakeDb();
    const out = await run(listUploadBatches(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { query: { page: 1, pageSize: 25 } },
    });

    assert.equal(out.status, 200);
    assert.deepEqual((calls.findManyWhere as { kitchenId?: bigint }).kitchenId, 3n);
  });

  test('a DATA_ADMIN cannot widen the filter to another dapur', async () => {
    const { db } = fakeDb();
    const out = await run(listUploadBatches(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { query: { page: 1, pageSize: 25, kitchenId: 4n } },
    });

    assert.equal(out.status, 403);
    assert.equal(out.body?.error, 'forbidden');
  });

  test('a SUPER_ADMIN is not kitchen-filtered', async () => {
    const { db, calls } = fakeDb();
    await run(listUploadBatches(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { query: { page: 1, pageSize: 25 } },
    });

    assert.equal('kitchenId' in (calls.findManyWhere as object), false);
  });
});

describe('createUploadBatch (SCRUM-5/6)', () => {
  const body = {
    kitchenId: 3n,
    fileName: 'menu-agustus.xlsx',
    fileHash: VALID_HASH.toUpperCase(),
    rowCount: 120,
    notes: null,
  };

  test('registers the batch as PROCESSING and attributes the uploader', async () => {
    const { db, calls } = fakeDb();
    const out = await run(createUploadBatch(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { body },
    });

    assert.equal(out.status, 201);
    const created = calls.created as Record<string, unknown>;
    assert.equal(created.status, 'PROCESSING');
    assert.equal(created.uploaderId, 1n);
    // Hashes are normalised, so the same file uploaded twice in different
    // case still collides on the UNIQUE index.
    assert.equal(created.fileHash, VALID_HASH);
  });

  test('a duplicate file answers 409 and returns the batch already on record', async () => {
    const existing = { id: 7n, fileName: 'menu-agustus.xlsx', status: 'DITERIMA' };
    const { db } = fakeDb({
      create: async () => {
        throw new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        });
      },
      findUnique: async () => existing,
    });

    const out = await run(createUploadBatch(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { body },
    });

    assert.equal(out.status, 409);
    assert.equal(out.body?.error, 'conflict');
    const details = out.body?.details as { field: string; batch: { id: string } };
    assert.equal(details.field, 'fileHash');
    // SCRUM-6: the client must be able to tell "same file" from "failed".
    assert.equal(details.batch.id, '7');
  });

  test('a DATA_ADMIN cannot register a batch for another dapur', async () => {
    const { db } = fakeDb();
    const out = await run(createUploadBatch(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { body: { ...body, kitchenId: 4n } },
    });

    assert.equal(out.status, 403);
  });
});

describe('updateUploadBatch (SCRUM-5)', () => {
  test('404 when the batch does not exist', async () => {
    const { db } = fakeDb();
    const out = await run(updateUploadBatch(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { params: { id: 9n }, body: { status: 'DITERIMA' } },
    });

    assert.equal(out.status, 404);
  });

  test('a DATA_ADMIN cannot review another dapur\u2019s batch', async () => {
    const { db } = fakeDb({ findUnique: async () => ({ id: 9n, kitchenId: 4n, status: 'PROCESSING' }) });
    const out = await run(updateUploadBatch(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { params: { id: 9n }, body: { status: 'DITERIMA' } },
    });

    assert.equal(out.status, 403);
  });

  test('records the verification outcome', async () => {
    const { db, calls } = fakeDb({
      findUnique: async () => ({ id: 9n, kitchenId: 3n, status: 'PROCESSING' }),
    });
    const out = await run(updateUploadBatch(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { params: { id: 9n }, body: { status: 'DITOLAK', notes: 'kolom BDD kosong' } },
    });

    assert.equal(out.status, 200);
    assert.deepEqual(calls.updated, { status: 'DITOLAK', notes: 'kolom BDD kosong' });
  });
});
