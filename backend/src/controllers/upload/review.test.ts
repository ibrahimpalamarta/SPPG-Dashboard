import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { Db } from '../../db.js';
import type { Role } from '../../auth/roles.js';
import type { AppUser } from '../../auth/user.js';
import { publishUploadBatch, returnUploadBatch, submitUploadBatch } from './review.js';

// Kitchen-scoped roles need dapur 3, the batch's; the others see every dapur.
const user = (role: Role, id = 1n): AppUser => ({ id, role, kitchenScopes: role === 'DATA_ADMIN' ? [{ kitchenId: 3n }] : [] }) as unknown as AppUser;

async function run(handler: ReturnType<typeof publishUploadBatch>, req: Partial<Request>) {
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

const batch = (over: Record<string, unknown> = {}) => ({ id: 9n, publicId: 'new-batch', kitchenId: 3n, uploaderId: 2n, status: 'READY', replacesBatchId: null, ...over });

function fakeDb(row: Record<string, unknown> | null, openCritical = 0) {
  const calls: { updates: Record<string, unknown>[]; raw: string[]; audits: string[]; replacedWhere?: unknown } = { updates: [], raw: [], audits: [] };
  let current = row;
  const uploadBatch = {
    findUnique: async () => current,
    findUniqueOrThrow: async () => current,
    update: async ({ data }: { data: Record<string, unknown> }) => {
      calls.updates.push(data);
      current = { ...current, ...data };
      return current;
    },
    updateMany: async ({ where, data }: { where: { id?: bigint; publicId?: string; status: string }; data: Record<string, unknown> }) => {
      if (where.publicId) {
        calls.replacedWhere = where;
        calls.updates.push({ replaced: where.publicId, ...data });
        return { count: 1 };
      }
      if (current?.status !== where.status) return { count: 0 };
      calls.updates.push(data);
      current = { ...current, ...data };
      return { count: 1 };
    },
  };
  const tx = {
    uploadBatch,
    $executeRaw: async (strings: TemplateStringsArray) => {
      calls.raw.push(strings.join('?'));
      return 2;
    },
  };
  const db = {
    uploadBatch,
    validationIssue: { count: async () => openCritical },
    financeTransaction: { count: async () => 5 },
    auditLog: { create: async ({ data }: { data: { action: string } }) => void calls.audits.push(data.action) },
    $transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as Db;
  return { db, calls };
}

const params = { params: { id: 9n } };

describe('submit to PM (SCRUM-117)', () => {
  test('NEEDS_REVIEW → READY, clearing a previous return note', async () => {
    const { db, calls } = fakeDb(batch({ status: 'NEEDS_REVIEW', errorCode: 'RETURNED' }));
    const out = await run(submitUploadBatch(db), { user: user('DATA_ADMIN'), valid: params });
    assert.equal(out.status, 200);
    assert.equal(calls.updates[0]?.status, 'READY');
    assert.equal(calls.updates[0]?.errorCode, null);
    assert.deepEqual(calls.audits, ['upload_batch.submitted']);
  });

  test('held while a CRITICAL finding is open', async () => {
    const { db, calls } = fakeDb(batch({ status: 'NEEDS_REVIEW' }), 1);
    const out = await run(submitUploadBatch(db), { user: user('DATA_ADMIN'), valid: params });
    assert.equal(out.status, 409);
    assert.equal(out.body?.error, 'batch_blocked');
    assert.equal(calls.updates.length, 0);
  });
});

describe('return to Data Operasional (SCRUM-117)', () => {
  test('READY → NEEDS_REVIEW with the note as the reason', async () => {
    const { db, calls } = fakeDb(batch());
    const out = await run(returnUploadBatch(db), { user: user('SUPER_ADMIN'), valid: { ...params, body: { note: 'Total Mei belum cocok' } } });
    assert.equal(out.status, 200);
    assert.deepEqual(calls.updates[0], { status: 'NEEDS_REVIEW', validatedAt: null, errorCode: 'RETURNED', errorSummary: 'Total Mei belum cocok' });
    assert.deepEqual(calls.audits, ['upload_batch.returned']);
  });
});

describe('publish (SCRUM-95/78/96)', () => {
  test('READY is published, earlier published rows with the same key are superseded, audited', async () => {
    const { db, calls } = fakeDb(batch());
    const out = await run(publishUploadBatch(db), { user: user('SUPER_ADMIN'), valid: params });
    assert.equal(out.status, 200);
    assert.equal(out.body?.status, 'PUBLISHED');
    // One supersede statement per canonical table.
    assert.equal(calls.raw.length, 6);
    assert.ok(calls.raw.every((sql) => sql.includes("status = 'PUBLISHED'")));
    assert.deepEqual(calls.audits, ['upload_batch.published']);
  });

  test('publishing again is a no-op (idempotent)', async () => {
    const { db, calls } = fakeDb(batch({ status: 'PUBLISHED' }));
    const out = await run(publishUploadBatch(db), { user: user('SUPER_ADMIN'), valid: params });
    assert.equal(out.status, 200);
    assert.equal(out.body?.alreadyPublished, true);
    assert.equal(calls.raw.length, 0);
    assert.equal(calls.audits.length, 0);
  });

  test('a correction closes the published batch it corrects', async () => {
    const { db, calls } = fakeDb(batch({ replacesBatchId: 'old-batch' }));
    await run(publishUploadBatch(db), { user: user('SUPER_ADMIN'), valid: params });
    assert.deepEqual(calls.replacedWhere, { publicId: 'old-batch', status: 'PUBLISHED' });
    assert.ok(calls.updates.some((u) => u.replaced === 'old-batch' && u.status === 'SUPERSEDED'));
  });

  test('the uploader cannot publish their own batch (four-eyes)', async () => {
    const { db, calls } = fakeDb(batch({ uploaderId: 1n }));
    const out = await run(publishUploadBatch(db), { user: user('DATA_STEWARD', 1n), valid: params });
    assert.equal(out.status, 403);
    assert.equal(calls.updates.length, 0);
  });

  test('not before review, and not with an open blocker', async () => {
    for (const [row, open, error] of [[batch({ status: 'NEEDS_REVIEW' }), 0, 'invalid_transition'], [batch(), 2, 'batch_blocked']] as const) {
      const { db, calls } = fakeDb(row, open);
      const out = await run(publishUploadBatch(db), { user: user('SUPER_ADMIN'), valid: params });
      assert.equal(out.status, 409);
      assert.equal(out.body?.error, error);
      assert.equal(calls.raw.length, 0);
    }
  });
});
