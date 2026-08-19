import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import type { Db } from '../../db.js';
import type { AuditEntry } from '../../auth/audit.js';
import { ANNOUNCEMENT, createCms, updateCms } from './cms.js';

const admin = { id: 1n, role: 'CMS_ADMIN' } as User;

async function run(handler: ReturnType<typeof createCms>, req: Partial<Request>) {
  let status: number | undefined;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;

  await handler(req as Request, res, () => {});
  return { status };
}

function fakeDb(current: Record<string, unknown> | null = null) {
  const calls: { data?: Record<string, unknown> } = {};
  const audits: AuditEntry[] = [];
  const db = {
    cmsAnnouncement: {
      findUnique: async () => current,
      create: async (args: { data: Record<string, unknown> }) => {
        calls.data = args.data;
        return { id: 5n, title: 'T', status: args.data.status ?? 'DRAFT' };
      },
      update: async (args: { data: Record<string, unknown> }) => {
        calls.data = args.data;
        return { id: 5n, title: 'T', status: args.data.status ?? 'DRAFT' };
      },
    },
    auditLog: {
      create: async ({ data }: { data: AuditEntry }) => {
        audits.push(data);
        return {};
      },
    },
  } as unknown as Db;

  return { db, calls, audits };
}

describe('CMS announcements (SCRUM-14)', () => {
  test('a draft is created without a publish date', async () => {
    const { db, calls } = fakeDb();
    const { status } = await run(createCms(ANNOUNCEMENT, db), {
      user: admin,
      valid: { body: { title: 'T', body: 'B', status: 'DRAFT' } },
    });

    assert.equal(status, 201);
    assert.equal('publishDate' in calls.data!, false);
    assert.equal(calls.data!.createdById, 1n);
  });

  test('publishing at creation stamps the publish date', async () => {
    const { db, calls } = fakeDb();
    await run(createCms(ANNOUNCEMENT, db), {
      user: admin,
      valid: { body: { title: 'T', body: 'B', status: 'PUBLISHED' } },
    });

    assert.ok(calls.data!.publishDate instanceof Date);
  });

  test('the DRAFT to PUBLISHED transition stamps the date', async () => {
    const { db, calls } = fakeDb({ id: 5n, status: 'DRAFT' });
    await run(updateCms(ANNOUNCEMENT, db), {
      user: admin,
      valid: { params: { id: 5n }, body: { status: 'PUBLISHED' } },
    });

    assert.ok(calls.data!.publishDate instanceof Date);
  });

  test('re-saving an already published item does not move its publish date', async () => {
    const { db, calls } = fakeDb({ id: 5n, status: 'PUBLISHED' });
    await run(updateCms(ANNOUNCEMENT, db), {
      user: admin,
      valid: { params: { id: 5n }, body: { status: 'PUBLISHED', title: 'edited' } },
    });

    assert.equal('publishDate' in calls.data!, false);
  });

  test('every mutation writes an audit row, per all-actions-logged', async () => {
    const { db, audits } = fakeDb();
    await run(createCms(ANNOUNCEMENT, db), {
      user: admin,
      valid: { body: { title: 'T', body: 'B' } },
    });

    assert.equal(audits.length, 1);
    assert.equal(audits[0]!.action, 'cms_announcements.created');
    assert.equal(audits[0]!.entity, 'cms_announcements');
    assert.equal(audits[0]!.userId, 1n);
  });

  test('a status change is logged as such, with both ends recorded', async () => {
    const { db, audits } = fakeDb({ id: 5n, status: 'DRAFT' });
    await run(updateCms(ANNOUNCEMENT, db), {
      user: admin,
      valid: { params: { id: 5n }, body: { status: 'PUBLISHED' } },
    });

    assert.equal(audits[0]!.action, 'cms_announcements.status_changed');
    assert.deepEqual(audits[0]!.metadata, {
      fields: ['status'],
      from: 'DRAFT',
      to: 'PUBLISHED',
    });
  });

  test('updating a row that is gone answers 404', async () => {
    const { db } = fakeDb(null);
    const { status } = await run(updateCms(ANNOUNCEMENT, db), {
      user: admin,
      valid: { params: { id: 5n }, body: { title: 'x' } },
    });

    assert.equal(status, 404);
  });
});
