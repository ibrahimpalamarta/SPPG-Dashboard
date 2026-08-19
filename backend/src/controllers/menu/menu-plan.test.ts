import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import type { Db } from '../../db.js';
import type { Role } from '../../auth/roles.js';
import { listMenuPlans } from './menu-plan.js';

const userWith = (role: Role, scopeId: bigint | null = null): User =>
  ({ id: 1n, role, scopeId }) as User;

const ROW = {
  id: 1n,
  menuName: 'Ayam Goreng',
  bahan: 'Ayam',
  energi: 250,
  hargaBahan: 12000,
  totalHarga: 480000,
};

async function run(handler: ReturnType<typeof listMenuPlans>, req: Partial<Request>) {
  let status: number | undefined;
  let body: Record<string, unknown> | undefined;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: unknown) {
      body = payload as Record<string, unknown>;
      return this;
    },
  } as unknown as Response;

  await handler(req as Request, res, () => {});
  return { status, body };
}

function fakeDb() {
  const calls: { where?: Record<string, unknown> } = {};
  const db = {
    menuPlan: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        calls.where = args.where;
        return [ROW];
      },
      count: async () => 1,
    },
  } as unknown as Db;
  return { db, calls };
}

const firstRow = (body: Record<string, unknown> | undefined) =>
  (body?.data as Record<string, unknown>[])[0]!;

describe('listMenuPlans (SCRUM-2)', () => {
  test('a DATA_ADMIN is confined to its own dapur', async () => {
    const { db, calls } = fakeDb();
    await run(listMenuPlans(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { query: { page: 1, pageSize: 25 } },
    });
    assert.equal(calls.where?.kitchenId, 3n);
  });

  test('a DATA_ADMIN asking for another dapur gets 403', async () => {
    const { db } = fakeDb();
    const { status } = await run(listMenuPlans(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { query: { page: 1, pageSize: 25, kitchenId: 4n } },
    });
    assert.equal(status, 403);
  });

  test('SCRUM-13: cost columns reach INTERNAL', async () => {
    const { db } = fakeDb();
    const { body } = await run(listMenuPlans(db), {
      user: userWith('INTERNAL'),
      valid: { query: { page: 1, pageSize: 25 } },
    });
    assert.equal(firstRow(body).hargaBahan, 12000);
    assert.equal(firstRow(body).totalHarga, 480000);
  });

  test('SCRUM-13: cost columns are stripped for a PUBLIC-role token', async () => {
    const { db } = fakeDb();
    const { body } = await run(listMenuPlans(db), {
      user: userWith('PUBLIC'),
      valid: { query: { page: 1, pageSize: 25 } },
    });
    const row = firstRow(body);
    assert.equal('hargaBahan' in row, false);
    assert.equal('totalHarga' in row, false);
    assert.equal(row.menuName, 'Ayam Goreng');
  });

  test('search covers both the dish and the ingredient column', async () => {
    const { db, calls } = fakeDb();
    await run(listMenuPlans(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { query: { page: 1, pageSize: 25, search: 'ayam' } },
    });
    const or = calls.where?.OR as Record<string, unknown>[];
    assert.deepEqual(Object.keys(or[0]!), ['menuName']);
    assert.deepEqual(Object.keys(or[1]!), ['bahan']);
  });

  test('the page envelope carries the total so the client can page', async () => {
    const { db } = fakeDb();
    const { body } = await run(listMenuPlans(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { query: { page: 1, pageSize: 25 } },
    });
    assert.deepEqual(body?.meta, { page: 1, pageSize: 25, total: 1, totalPages: 1 });
  });
});
