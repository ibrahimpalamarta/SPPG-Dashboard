import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { requireAuth, requireRole, requirePermission, resolveKitchenIds } from './guard.js';
import { clearPermissionCache, permissionsFor } from './rbac-store.js';
import { sha256 } from '../lib/crypto.js';
import type { Permission, Role } from './roles.js';
import type { AppUser } from './user.js';
import type { Db } from '../db.js';

const userWith = (role: Role, kitchenIds: bigint[] = [], permissions: Permission[] = []): AppUser => ({
  id: 1n,
  email: 'a@example.com',
  fullName: 'A',
  role,
  status: 'ACTIVE',
  lastLoginAt: null,
  failedLoginCount: 0,
  lockedUntil: null,
  mfaEnabled: false,
  kitchenScopes: kitchenIds.map((kitchenId) => ({ kitchenId })),
  permissions,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function response() {
  const out: { status?: number; body?: { error?: string } } = {};
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(payload: unknown) {
      out.body = payload as { error?: string };
      return this;
    },
  } as unknown as Response;
  return { res, out };
}

function run(handler: ReturnType<typeof requireRole>, req: Partial<Request>) {
  const { res, out } = response();
  let nexted = false;
  handler(req as Request, res, () => {
    nexted = true;
  });
  return { status: out.status, body: out.body, nexted };
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

  test('denies the view-only roles on a mutating route', () => {
    const mutate = requireRole('SUPER_ADMIN', 'DATA_ADMIN');
    for (const role of ['MANAGEMENT', 'FINANCE', 'KEPALA_KITCHEN'] as const) {
      assert.equal(run(mutate, { user: userWith(role) }).status, 403, role);
    }
  });

  test('returns 401, not 403, when no user was attached', () => {
    const { status, nexted } = run(requireRole('MANAGEMENT'), {});
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });
});

describe('requirePermission', () => {
  test('passes when the request carries the permission', () => {
    const user = userWith('DATA_ADMIN', [3n], ['upload:create']);
    assert.equal(run(requirePermission('upload:create'), { user }).nexted, true);
  });

  test('403 when it does not — the role name alone grants nothing', () => {
    const user = userWith('DATA_ADMIN', [3n], ['upload:create']);
    assert.equal(run(requirePermission('users:manage'), { user }).status, 403);
    assert.equal(run(requirePermission('batch:publish'), { user }).status, 403);
  });

  test('least privilege: a user-management permission is not implied by being an admin role', () => {
    assert.equal(run(requirePermission('users:read'), { user: userWith('DATA_STEWARD') }).status, 403);
  });

  test('returns 401 when no user was attached', () => {
    assert.equal(run(requirePermission('upload:view'), {}).status, 401);
  });
});

describe('resolveKitchenIds', () => {
  test('SUPER_ADMIN is unscoped even with rows', () => {
    assert.equal(resolveKitchenIds(userWith('SUPER_ADMIN', [7n])), null);
  });

  test('DATA_ADMIN is pinned to its own kitchens', () => {
    assert.deepEqual(resolveKitchenIds(userWith('DATA_ADMIN', [7n, 8n])), [7n, 8n]);
  });

  test('DATA_ADMIN with no rows gets an empty set, not everything', () => {
    assert.deepEqual(resolveKitchenIds(userWith('DATA_ADMIN')), []);
  });
});

describe('requireAuth', () => {
  const TOKEN = 'session-token-value';
  const now = Date.now();

  /** A db whose only live session is for TOKEN; `patch` bends it into each failure mode. */
  const dbWith = (patch: { revokedAt?: Date; expiresAt?: Date; lastSeenAt?: Date; status?: 'ACTIVE' | 'INACTIVE' } = {}) => {
    const user = { ...userWith('MANAGEMENT'), status: patch.status ?? 'ACTIVE' };
    const touched: unknown[] = [];
    const db = {
      session: {
        findUnique: async ({ where }: { where: { tokenHash: string } }) =>
          where.tokenHash === sha256(TOKEN)
            ? {
                id: 9n,
                revokedAt: patch.revokedAt ?? null,
                expiresAt: patch.expiresAt ?? new Date(now + 3_600_000),
                lastSeenAt: patch.lastSeenAt ?? new Date(now),
                user,
              }
            : null,
        update: async (args: unknown) => touched.push(args),
      },
      rolePermission: { findMany: async () => [{ permission: 'upload:view' }, { permission: 'retired:perm' }] },
    } as unknown as Db;
    return { db, touched };
  };

  async function call(db: Db, authorization?: string) {
    clearPermissionCache();
    const req = { headers: authorization ? { authorization } : {} } as Request;
    const { res, out } = response();
    let nexted = false;
    await requireAuth(db)(req, res, () => {
      nexted = true;
    });
    return { req, status: out.status, body: out.body, nexted };
  }

  test('no Authorization header → 401 before touching the database', async () => {
    const r = await call({} as unknown as Db);
    assert.equal(r.status, 401);
    assert.equal(r.nexted, false);
  });

  test('an unknown token → 401', async () => {
    assert.equal((await call(dbWith().db, 'Bearer nope')).status, 401);
  });

  test('a live session attaches the Postgres user and its current permissions', async () => {
    const r = await call(dbWith().db, `Bearer ${TOKEN}`);
    assert.equal(r.nexted, true);
    assert.equal(r.req.user?.role, 'MANAGEMENT');
    assert.equal(r.req.sessionId, 9n);
    // Retired permission names in the table are dropped, not trusted.
    assert.deepEqual(r.req.user?.permissions, ['upload:view']);
  });

  test('a revoked session is dead immediately', async () => {
    const r = await call(dbWith({ revokedAt: new Date(now - 1000) }).db, `Bearer ${TOKEN}`);
    assert.equal(r.status, 401);
  });

  test('past the absolute expiry → 401', async () => {
    assert.equal((await call(dbWith({ expiresAt: new Date(now - 1) }).db, `Bearer ${TOKEN}`)).status, 401);
  });

  test('idle for longer than the idle timeout → 401', async () => {
    const stale = new Date(now - 9 * 60 * 60_000);
    assert.equal((await call(dbWith({ lastSeenAt: stale }).db, `Bearer ${TOKEN}`)).status, 401);
  });

  test('a deactivated account loses access even with a valid session', async () => {
    assert.equal((await call(dbWith({ status: 'INACTIVE' }).db, `Bearer ${TOKEN}`)).status, 401);
  });

  test('every failure mode answers with the same body', async () => {
    const bodies = await Promise.all([
      call(dbWith().db, 'Bearer nope'),
      call(dbWith({ revokedAt: new Date(now - 1) }).db, `Bearer ${TOKEN}`),
      call(dbWith({ status: 'INACTIVE' }).db, `Bearer ${TOKEN}`),
    ]);
    assert.equal(new Set(bodies.map((b) => JSON.stringify(b.body))).size, 1);
  });

  test('only touches lastSeenAt when it is a minute stale', async () => {
    const fresh = dbWith();
    await call(fresh.db, `Bearer ${TOKEN}`);
    assert.equal(fresh.touched.length, 0);

    const older = dbWith({ lastSeenAt: new Date(now - 5 * 60_000) });
    await call(older.db, `Bearer ${TOKEN}`);
    assert.equal(older.touched.length, 1);
  });
});

describe('SUPER_ADMIN permissions (four-eyes)', () => {
  test('reviewer holds publish and review but not the maker permissions', async () => {
    const granted = await permissionsFor('SUPER_ADMIN', {} as Db);
    assert.ok(granted.includes('batch:publish') && granted.includes('users:manage'));
    assert.ok(!granted.includes('upload:create') && !granted.includes('mapping:propose'));
  });
});
