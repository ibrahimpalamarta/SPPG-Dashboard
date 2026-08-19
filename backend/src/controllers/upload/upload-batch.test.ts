import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import type { Db } from '../../db.js';
import type { Role } from '../../auth/roles.js';
import { createUploadBatch, listUploadBatches, updateUploadBatch } from './upload-batch.js';

const userWith = (role: Role, scopeId: bigint | null = null): User =>
  ({ id: 1n, role, scopeId } as User);

/** One importable row, built in memory so the suite needs no fixture file. */
async function validWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Menu');
  sheet.addRow([
    'Tanggal',
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
  ]);
  sheet.addRow([
    new Date('2026-08-03'),
    'Basah',
    'Kecil',
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
  ]);
  return Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
}

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
  const body = { kitchenId: 3n, notes: null };

  /** The file multer would have put on the request. */
  const withFile = async (buffer?: Buffer, dryRun = false) => ({
    user: userWith('DATA_ADMIN', 3n),
    valid: { body, query: { dryRun } },
    file: {
      buffer: buffer ?? (await validWorkbook()),
      originalname: 'menu-agustus.xlsx',
    } as Express.Multer.File,
  });

  /** Records what would have been written to S3 without touching the network. */
  function fakePut() {
    const puts: { key: string; bytes: number }[] = [];
    const put = async (key: string, bytes: Buffer) => {
      puts.push({ key, bytes: bytes.length });
      return key;
    };
    return { put, puts };
  }

  test('a clean workbook is imported with its rows in the same write', async () => {
    const { db, calls } = fakeDb();
    const { put, puts } = fakePut();

    const out = await run(createUploadBatch(db, put), await withFile());

    assert.equal(out.status, 201);
    const created = calls.created as Record<string, unknown>;
    // SCRUM-5 AC3: a workbook that parsed is accepted outright, not left
    // sitting in PROCESSING for someone to click through.
    assert.equal(created.status, 'DITERIMA');
    assert.equal(created.uploaderId, 1n);
    assert.equal(created.fileName, 'menu-agustus.xlsx');
    assert.equal(created.rowCount, 1);

    // SCRUM-6 AC2: the rows ride along on the parent create, which is what
    // makes the import all-or-nothing.
    const nested = created.menuPlans as { createMany: { data: { kitchenId: bigint }[] } };
    assert.equal(nested.createMany.data.length, 1);
    assert.equal(nested.createMany.data[0]?.kitchenId, 3n);

    // The object is stored under the hash, so the same bytes never sprawl.
    assert.equal(puts.length, 1);
    assert.match(puts[0]!.key, /^upload-batches\/[a-f0-9]{64}\.xlsx$/);
  });

  test('dryRun reports columns and row count without writing anything', async () => {
    const { db, calls } = fakeDb();
    const { put, puts } = fakePut();

    const out = await run(createUploadBatch(db, put), await withFile(undefined, true));

    assert.equal(out.status, 200);
    assert.equal(out.body?.rowCount, 1);
    assert.ok((out.body?.columns as string[]).includes('Jumlah PM'));
    // SCRUM-6 AC1: a preview is a read. Nothing reached Postgres or S3.
    assert.equal(calls.created, undefined);
    assert.equal(puts.length, 0);
  });

  test('an unparseable workbook is recorded as DITOLAK rather than only 4xx', async () => {
    const { db, calls } = fakeDb();
    const { put, puts } = fakePut();

    const out = await run(
      createUploadBatch(db, put),
      await withFile(Buffer.from('not a workbook')),
    );

    assert.equal(out.status, 422);
    // SCRUM-5 AC3 wants the rejection in the history, so the batch row exists.
    const created = calls.created as Record<string, unknown>;
    assert.equal(created.status, 'DITOLAK');
    assert.equal(created.rowCount, 0);
    assert.match(String(created.notes), /not a readable \.xlsx workbook/);
    // A file we could not read is not a file worth keeping.
    assert.equal(puts.length, 0);
  });

  test('a file already on record answers 409 with the existing batch', async () => {
    const existing = { id: 7n, fileName: 'menu-agustus.xlsx', status: 'DITERIMA' };
    const { db, calls } = fakeDb({ findUnique: async () => existing });
    const { put } = fakePut();

    const out = await run(createUploadBatch(db, put), await withFile());

    assert.equal(out.status, 409);
    const details = out.body?.details as { field: string; batch: { id: string } };
    assert.equal(details.field, 'fileHash');
    // SCRUM-6 AC3: the client must be able to tell "same file" from "failed".
    assert.equal(details.batch.id, '7');
    assert.equal(calls.created, undefined);
  });

  test('the race between two identical uploads still answers 409', async () => {
    const { db } = fakeDb({
      create: async () => {
        throw new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        });
      },
    });
    const { put } = fakePut();

    const out = await run(createUploadBatch(db, put), await withFile());

    assert.equal(out.status, 409);
    assert.equal(out.body?.error, 'conflict');
  });

  test('a DATA_ADMIN cannot upload for another dapur', async () => {
    const { db } = fakeDb();
    const { put } = fakePut();
    const req = await withFile();

    const out = await run(createUploadBatch(db, put), {
      ...req,
      valid: { body: { ...body, kitchenId: 4n }, query: { dryRun: false } },
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
