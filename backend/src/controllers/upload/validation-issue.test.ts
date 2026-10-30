import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { Db } from '../../db.js';
import type { Role } from '../../auth/roles.js';
import type { AppUser } from '../../auth/user.js';
import { listValidationIssues, resolveValidationIssues } from './validation-issue.js';

const userWith = (role: Role, kitchenId: bigint | null = null): AppUser =>
  ({ id: 1n, role, kitchenScopes: kitchenId === null ? [] : [{ kitchenId }] }) as AppUser;

async function run(handler: ReturnType<typeof listValidationIssues>, req: Partial<Request>) {
  const out: { status?: number; body?: Record<string, unknown> } = {};
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(payload: unknown) {
      out.body = payload as Record<string, unknown>;
      return this;
    },
  } as unknown as Response;
  await handler(req as Request, res, () => {});
  return out;
}

function fakeDb(batch: Record<string, unknown> | null) {
  const calls: { where?: unknown; update?: { where: unknown; data: Record<string, unknown> }; audits: unknown[] } = { audits: [] };
  const db = {
    uploadBatch: { findUnique: async () => batch },
    validationIssue: {
      findMany: async (args: { where: unknown }) => {
        calls.where = args.where;
        return [];
      },
      count: async () => 0,
      updateMany: async (args: { where: unknown; data: Record<string, unknown> }) => {
        calls.update = args;
        return { count: 3 };
      },
    },
    auditLog: { create: async (args: { data: unknown }) => void calls.audits.push(args.data) },
  } as unknown as Db;
  return { db, calls };
}

describe('validation queue (SCRUM-68)', () => {
  test('filters and kitchen scope reach the query', async () => {
    const { db, calls } = fakeDb(null);
    const out = await run(listValidationIssues(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { query: { page: 1, pageSize: 25, severity: 'CRITICAL', status: 'OPEN' } },
    });
    assert.equal(out.status, 200);
    assert.deepEqual(calls.where, { kitchenId: { in: [3n] }, severity: 'CRITICAL', status: 'OPEN' });
  });

  test('another dapur is refused', async () => {
    const { db } = fakeDb(null);
    const out = await run(listValidationIssues(db), { user: userWith('DATA_ADMIN', 3n), valid: { query: { page: 1, pageSize: 25, kitchenId: 4n } } });
    assert.equal(out.status, 403);
  });
});

describe('resolve issues (SCRUM-51)', () => {
  const body = { uploadBatchId: '00000000-0000-0000-0000-000000000001', code: 'NO_TXN_ID', note: 'baris subtotal, bukan transaksi' };

  test('closes the OPEN issues of one code with the note and who did it, and audits it', async () => {
    const { db, calls } = fakeDb({ id: 9n, kitchenId: 3n, status: 'NEEDS_REVIEW' });
    const out = await run(resolveValidationIssues(db), { user: userWith('DATA_ADMIN', 3n), valid: { body } });
    assert.equal(out.status, 200);
    assert.deepEqual(out.body, { resolved: 3 });
    assert.deepEqual(calls.update?.where, { uploadBatchId: body.uploadBatchId, code: 'NO_TXN_ID', status: 'OPEN' });
    assert.equal(calls.update?.data.note, body.note);
    assert.equal(calls.update?.data.resolvedById, 1n);
    assert.equal(calls.audits.length, 1);
  });

  test('only while the batch is still with Data Operasional', async () => {
    const { db, calls } = fakeDb({ id: 9n, kitchenId: 3n, status: 'READY' });
    const out = await run(resolveValidationIssues(db), { user: userWith('DATA_ADMIN', 3n), valid: { body } });
    assert.equal(out.status, 409);
    assert.equal(calls.update, undefined);
  });

  test('another dapur’s batch is refused', async () => {
    const { db } = fakeDb({ id: 9n, kitchenId: 4n, status: 'NEEDS_REVIEW' });
    const out = await run(resolveValidationIssues(db), { user: userWith('DATA_ADMIN', 3n), valid: { body } });
    assert.equal(out.status, 403);
  });
});
