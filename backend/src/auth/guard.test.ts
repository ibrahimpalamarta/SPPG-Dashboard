import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { requireRole, resolveScopeId, attachUser } from './guard.js';
import type { Role } from './roles.js';
import type { Db } from '../db.js';

const userWith = (role: Role, scopeId: string | null = null): User => ({
  id: 'u1',
  auth0Sub: 'auth0|abc123',
  email: 'a@example.com',
  name: 'A',
  role,
  scopeId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function run(handler: ReturnType<typeof requireRole>, req: Partial<Request>) {
  let status: number | undefined;
  let body: { error?: string } | undefined;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: unknown) {
      body = payload as { error?: string };
      return this;
    },
  } as unknown as Response;
  let nexted = false;

  handler(req as Request, res, () => {
    nexted = true;
  });
  return { status, body, nexted };
}

describe('requireRole', () => {
  test('lets an allowed role through', () => {
    const { nexted, status } = run(requireRole('SUPER_ADMIN'), { user: userWith('SUPER_ADMIN') });
    assert.equal(nexted, true);
    assert.equal(status, undefined);
  });

  test('accepts any role on the allow-list', () => {
    const guard = requireRole('SUPER_ADMIN', 'DATA_ADMIN');
    assert.equal(run(guard, { user: userWith('DATA_ADMIN') }).nexted, true);
  });

  test('denies a role that is not on the list with 403', () => {
    const { status, body, nexted } = run(requireRole('SUPER_ADMIN'), { user: userWith('DATA_ADMIN') });
    assert.equal(status, 403);
    assert.equal(body?.error, 'forbidden');
    assert.equal(nexted, false);
  });

  test('denies INTERNAL on a mutating route (read-only role)', () => {
    const mutate = requireRole('SUPER_ADMIN', 'DATA_ADMIN');
    assert.equal(run(mutate, { user: userWith('INTERNAL') }).status, 403);
  });

  test('denies PUBLIC on every internal route', () => {
    const internalOnly = requireRole('SUPER_ADMIN', 'DATA_ADMIN', 'INTERNAL');
    const { status, nexted } = run(internalOnly, { user: userWith('PUBLIC') });
    assert.equal(status, 403);
    assert.equal(nexted, false);
  });

  test('returns 401, not 403, when no user was attached', () => {
    const { status, nexted } = run(requireRole('PUBLIC'), {});
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });
});

describe('resolveScopeId', () => {
  test('SUPER_ADMIN is unscoped', () => {
    assert.equal(resolveScopeId(userWith('SUPER_ADMIN', 'sppg-1')), null);
  });

  test('DATA_ADMIN is pinned to its own scope', () => {
    assert.equal(resolveScopeId(userWith('DATA_ADMIN', 'sppg-1')), 'sppg-1');
  });
});

describe('attachUser', () => {
  const db = {
    user: {
      findUnique: async () => userWith('INTERNAL'),
      upsert: async () => userWith('INTERNAL'),
    },
    auditLog: { create: async () => ({}) },
  } as unknown as Db;

  test('rejects with 401 when requireAuth did not run', async () => {
    const req = { headers: {} } as Request;
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
    let nexted = false;

    await attachUser(db)(req, res, () => {
      nexted = true;
    });
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('attaches the Postgres row, not the token claims', async () => {
    // Token says super_admin; Postgres says INTERNAL. Postgres wins.
    const req = { auth: { sub: 'auth0|abc123', roleClaims: ['super_admin'] } } as Request;
    const res = { status: () => res, json: () => res } as unknown as Response;

    await attachUser(db)(req, res, () => {});
    assert.equal(req.user?.role, 'INTERNAL');
    assert.equal(run(requireRole('SUPER_ADMIN'), req).status, 403);
  });
});
