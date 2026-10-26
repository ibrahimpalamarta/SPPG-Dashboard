import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, RequestHandler, Response } from 'express';
import type { Db } from '../../db.js';
import type { Permission, Role } from '../../auth/roles.js';
import type { AppUser } from '../../auth/user.js';
import { clearPermissionCache } from '../../auth/rbac-store.js';
import {
  cancelInvite,
  createPasswordReset,
  createUser,
  listUsers,
  memberStatus,
  revokeAllUserSessions,
  updateRolePermissions,
  updateUser,
} from './user.js';

const actor = (role: Role, permissions: Permission[], id = 1n): AppUser =>
  ({ id, role, permissions, kitchenScopes: [] }) as unknown as AppUser;

/** role -> permissions as stored in role_permissions. */
const TABLE: Partial<Record<Role, Permission[]>> = {
  DATA_ADMIN: ['upload:create', 'upload:view'],
  INTERNAL: ['upload:view'],
};

type Target = { role: Role; status?: 'ACTIVE' | 'INACTIVE'; passwordHash?: string | null };

function setup(targets: Record<string, Target> = {}, { otherSuperAdmins = 1 } = {}) {
  const calls = {
    sessionsRevoked: [] as unknown[],
    audit: [] as unknown[],
    updated: [] as unknown[],
    created: [] as unknown[],
    setPerms: [] as unknown[],
  };
  const db = {
    user: {
      findUnique: async ({ where }: { where: { id: bigint } }) => {
        const t = targets[String(where.id)];
        return t && { id: where.id, status: 'ACTIVE', kitchenScopes: [], ...t };
      },
      update: async (args: { where: { id: bigint } }) => {
        calls.updated.push(args);
        return { id: args.where.id, ...targets[String(args.where.id)] };
      },
      create: async ({ data }: { data: { role: Role } }) => {
        calls.created.push(data);
        return { id: 99n, ...data };
      },
      count: async () => otherSuperAdmins,
    },
    rolePermission: {
      findMany: async ({ where }: { where: { role: Role } }) =>
        (TABLE[where.role] ?? []).map((permission) => ({ permission })),
      deleteMany: async (a: unknown) => a,
      createMany: async (a: unknown) => calls.setPerms.push(a),
    },
    session: {
      updateMany: async (a: unknown) => {
        calls.sessionsRevoked.push(a);
        return { count: 1 };
      },
    },
    passwordResetToken: { updateMany: async (a: unknown) => a, create: async (a: unknown) => a },
    auditLog: { create: async ({ data }: { data: unknown }) => calls.audit.push(data) },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as Db;
  return { db, calls };
}

async function call(handler: RequestHandler, req: Partial<Request>) {
  clearPermissionCache();
  const out: { status?: number; body?: Record<string, unknown> } = {};
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(payload: unknown) {
      out.body = JSON.parse(
        JSON.stringify(payload, (_k, v: unknown) => (typeof v === 'bigint' ? String(v) : v)),
      ) as Record<string, unknown>;
      out.status ??= 200;
      return this;
    },
    end() {
      out.status ??= 200;
      return this;
    },
  } as unknown as Response;
  await handler(req as Request, res, () => {});
  return out;
}

const SUPER = actor('SUPER_ADMIN', ['users:manage', 'settings:manage']);
// users:manage on a lower-ranked account: the privilege-escalation candidate.
const MANAGER = actor('INTERNAL', ['users:manage', 'upload:view', 'settings:manage']);

describe('privilege escalation', () => {
  test('a user manager cannot mint a SUPER_ADMIN', async () => {
    const { db, calls } = setup();
    const body = { email: 'x@example.com', fullName: 'X', role: 'SUPER_ADMIN', kitchenIds: [] };
    const out = await call(createUser(db), { user: MANAGER, valid: { body } });
    assert.equal(out.status, 403);
    assert.equal(calls.created.length, 0);
  });

  test('nor promote an existing account to SUPER_ADMIN', async () => {
    const { db, calls } = setup({ '5': { role: 'INTERNAL' } });
    const valid = { params: { id: 5n }, body: { role: 'SUPER_ADMIN' } };
    assert.equal((await call(updateUser(db), { user: MANAGER, valid })).status, 403);
    assert.equal(calls.updated.length, 0);
  });

  test('nor touch a SUPER_ADMIN (deactivate, revoke sessions)', async () => {
    const { db, calls } = setup({ '5': { role: 'SUPER_ADMIN' } });
    const deactivate = { params: { id: 5n }, body: { status: 'INACTIVE' } };
    assert.equal((await call(updateUser(db), { user: MANAGER, valid: deactivate })).status, 403);
    assert.equal((await call(revokeAllUserSessions(db), { user: MANAGER, valid: { params: { id: 5n } } })).status, 403);
    assert.equal(calls.sessionsRevoked.length, 0);
  });

  test('a manager cannot hand out a role holding permissions it lacks', async () => {
    // DATA_ADMIN has upload:create, which MANAGER does not hold.
    const { db, calls } = setup();
    const body = { email: 'x@example.com', fullName: 'X', role: 'DATA_ADMIN', kitchenIds: [1n] };
    assert.equal((await call(createUser(db), { user: MANAGER, valid: { body } })).status, 403);
    assert.equal(calls.created.length, 0);
  });

  test('a manager may create a role within its own permissions', async () => {
    const { db } = setup();
    const body = { email: 'x@example.com', fullName: 'X', role: 'INTERNAL', kitchenIds: [] };
    const out = await call(createUser(db), { user: MANAGER, valid: { body } });
    assert.equal(out.status, 201);
    assert.equal(typeof out.body?.resetToken, 'string');
  });

  test('SUPER_ADMIN may create any role, and a new DATA_ADMIN needs a kitchen', async () => {
    const { db } = setup();
    const make = (role: string, kitchenIds: bigint[]) =>
      call(createUser(db), {
        user: SUPER,
        valid: { body: { email: 'x@example.com', fullName: 'X', role, kitchenIds } },
      });
    assert.equal((await make('SUPER_ADMIN', [])).status, 201);
    assert.equal((await make('DATA_ADMIN', [])).status, 400);
    assert.equal((await make('DATA_ADMIN', [3n])).status, 201);
  });

  test('nobody can change their own role or status', async () => {
    const { db } = setup({ '1': { role: 'SUPER_ADMIN' } });
    const valid = { params: { id: 1n }, body: { role: 'INTERNAL' } };
    assert.equal((await call(updateUser(db), { user: SUPER, valid })).status, 403);
  });
});

describe('access revocation', () => {
  test('deactivating an account ends its sessions at once', async () => {
    const { db, calls } = setup({ '5': { role: 'INTERNAL' } });
    await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { status: 'INACTIVE' } } });
    assert.equal(calls.sessionsRevoked.length, 1);
  });

  test('so does a role change, but a cosmetic edit does not', async () => {
    const { db, calls } = setup({ '5': { role: 'INTERNAL' } });
    await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { fullName: 'New Name' } } });
    assert.equal(calls.sessionsRevoked.length, 0);
    await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { role: 'CMS_ADMIN' } } });
    assert.equal(calls.sessionsRevoked.length, 1);
  });

  test('role and status changes are audited with before and after', async () => {
    const { db, calls } = setup({ '5': { role: 'INTERNAL' } });
    const valid = { params: { id: 5n }, body: { role: 'CMS_ADMIN', status: 'INACTIVE' } };
    await call(updateUser(db), { user: SUPER, valid });
    const entry = calls.audit[0] as { action: string; metadata: Record<string, unknown> };
    assert.equal(entry.action, 'user.updated');
    assert.equal(entry.metadata.roleFrom, 'INTERNAL');
    assert.equal(entry.metadata.roleTo, 'CMS_ADMIN');
    assert.equal(entry.metadata.statusTo, 'INACTIVE');
  });
});

describe('role permissions editor', () => {
  const put = (db: Db, user: AppUser, role: string, permissions: Permission[]) =>
    call(updateRolePermissions(db), { user, valid: { params: { role }, body: { permissions } } });

  test('SUPER_ADMIN permissions are fixed', async () => {
    const { db, calls } = setup();
    assert.equal((await put(db, SUPER, 'SUPER_ADMIN', [])).status, 403);
    assert.equal(calls.setPerms.length, 0);
  });

  test('SUPER_ADMIN can reshape another role, and the change is audited', async () => {
    const { db, calls } = setup();
    assert.equal((await put(db, SUPER, 'CMS_ADMIN', ['upload:view'])).status, 200);
    assert.equal(calls.setPerms.length, 1);
    assert.equal((calls.audit[0] as { action: string }).action, 'role.permissions_updated');
  });

  test('a settings manager cannot grant what it does not hold', async () => {
    const { db, calls } = setup();
    assert.equal((await put(db, MANAGER, 'PUBLIC', ['users:manage', 'batch:publish'])).status, 403);
    assert.equal(calls.setPerms.length, 0);
  });

  test('nor edit its own role', async () => {
    const { db } = setup();
    assert.equal((await put(db, MANAGER, 'INTERNAL', ['upload:view'])).status, 403);
  });

  test('but may grant permissions it holds to another role', async () => {
    const { db } = setup();
    assert.equal((await put(db, MANAGER, 'PUBLIC', ['upload:view'])).status, 200);
  });
});

const HOUR = 3_600_000;
const hoursFromNow = (iso: unknown) => (new Date(iso as string).getTime() - Date.now()) / HOUR;

describe('SCRUM-121: members and invitations', () => {
  test('memberStatus: inactive wins, a password means active, else the invitation decides', () => {
    const later = new Date(Date.now() + HOUR);
    const earlier = new Date(Date.now() - HOUR);
    assert.equal(memberStatus({ status: 'INACTIVE', hasPassword: true }, undefined), 'INACTIVE');
    assert.equal(memberStatus({ status: 'ACTIVE', hasPassword: true }, undefined), 'ACTIVE');
    assert.equal(memberStatus({ status: 'ACTIVE', hasPassword: false }, later), 'PENDING');
    assert.equal(memberStatus({ status: 'ACTIVE', hasPassword: false }, earlier), 'EXPIRED');
    assert.equal(memberStatus({ status: 'ACTIVE', hasPassword: false }, undefined), 'EXPIRED');
  });

  test('the list carries memberStatus and never the password hash', async () => {
    const rows = [
      { id: 1n, status: 'ACTIVE', passwordHash: 'h', passwordResetTokens: [] },
      { id: 2n, status: 'ACTIVE', passwordHash: null, passwordResetTokens: [{ expiresAt: new Date(Date.now() + HOUR) }] },
    ];
    const db = { user: { findMany: async () => rows, count: async () => rows.length } } as unknown as Db;
    const out = await call(listUsers(db), { valid: { query: { page: 1, pageSize: 20 } } });
    const data = out.body?.data as Record<string, unknown>[];
    assert.deepEqual(data.map((u) => u.memberStatus), ['ACTIVE', 'PENDING']);
    for (const u of data) {
      assert.equal('passwordHash' in u, false);
      assert.equal('passwordResetTokens' in u, false);
    }
  });

  test('an invitation link lives INVITE_TTL_HOURS (72 by default), on create and on resend', async () => {
    const { db, calls } = setup({ '5': { role: 'INTERNAL', passwordHash: null } });
    const body = { email: 'x@example.com', fullName: 'X', role: 'INTERNAL', kitchenIds: [] };
    const created = await call(createUser(db), { user: SUPER, valid: { body } });
    assert.ok(Math.abs(hoursFromNow(created.body?.resetTokenExpiresAt) - 72) < 0.1);

    const resent = await call(createPasswordReset(db), { user: SUPER, valid: { params: { id: 5n } } });
    assert.ok(Math.abs(hoursFromNow(resent.body?.resetTokenExpiresAt) - 72) < 0.1);
    assert.equal((calls.audit.at(-1) as { action: string }).action, 'user.invite_resent');
  });

  test('a password reset for an active account keeps the short reset lifetime', async () => {
    const { db, calls } = setup({ '5': { role: 'INTERNAL', passwordHash: 'h' } });
    const out = await call(createPasswordReset(db), { user: SUPER, valid: { params: { id: 5n } } });
    assert.ok(hoursFromNow(out.body?.resetTokenExpiresAt) <= 1);
    assert.equal((calls.audit.at(-1) as { action: string }).action, 'user.password_reset_issued');
  });

  test('cancelling an invitation deactivates the account and is audited', async () => {
    const { db, calls } = setup({ '5': { role: 'INTERNAL', passwordHash: null } });
    const out = await call(cancelInvite(db), { user: SUPER, valid: { params: { id: 5n } } });
    assert.equal(out.status, 204);
    assert.deepEqual((calls.updated[0] as { data: unknown }).data, { status: 'INACTIVE' });
    assert.equal((calls.audit[0] as { action: string }).action, 'user.invite_cancelled');
  });

  test('only an open invitation can be cancelled, and not by someone below its role', async () => {
    const active = setup({ '5': { role: 'INTERNAL', passwordHash: 'h' } });
    assert.equal((await call(cancelInvite(active.db), { user: SUPER, valid: { params: { id: 5n } } })).status, 409);
    const cancelled = setup({ '5': { role: 'INTERNAL', passwordHash: null, status: 'INACTIVE' } });
    assert.equal((await call(cancelInvite(cancelled.db), { user: SUPER, valid: { params: { id: 5n } } })).status, 409);
    const pm = setup({ '5': { role: 'SUPER_ADMIN', passwordHash: null } });
    assert.equal((await call(cancelInvite(pm.db), { user: MANAGER, valid: { params: { id: 5n } } })).status, 403);
    assert.equal(active.calls.updated.length + cancelled.calls.updated.length + pm.calls.updated.length, 0);
  });

  test('the last active PM MBG can be neither deactivated nor demoted', async () => {
    const { db, calls } = setup({ '5': { role: 'SUPER_ADMIN' } }, { otherSuperAdmins: 0 });
    for (const body of [{ status: 'INACTIVE' }, { role: 'INTERNAL' }]) {
      const out = await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body } });
      assert.equal(out.status, 409);
      assert.equal(out.body?.error, 'last_super_admin');
    }
    assert.equal(calls.updated.length, 0);
  });

  test('with another active PM MBG left, deactivating one is allowed', async () => {
    const { db, calls } = setup({ '5': { role: 'SUPER_ADMIN' } }, { otherSuperAdmins: 1 });
    const out = await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { status: 'INACTIVE' } } });
    assert.equal(out.status, 200);
    assert.equal(calls.updated.length, 1);
  });
});
