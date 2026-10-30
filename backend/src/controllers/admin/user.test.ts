import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, RequestHandler, Response } from 'express';
import type { Db } from '../../db.js';
import type { Permission, Role } from '../../auth/roles.js';
import type { AppUser } from '../../auth/user.js';
import type { SendMail } from '../../lib/mailer.js';
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
};

type Target = {
  role: Role;
  status?: 'ACTIVE' | 'INACTIVE';
  passwordHash?: string | null;
  kitchenScopes?: { kitchen: { id: bigint } }[];
};
/** A Data Operasional account tied to its one dapur (SCRUM-144). */
const OWN_DAPUR = [{ kitchen: { id: 1n } }];

function setup(targets: Record<string, Target> = {}, { otherAdmins = 1 } = {}) {
  const calls = {
    sessionsRevoked: [] as unknown[],
    audit: [] as unknown[],
    updated: [] as unknown[],
    deleted: [] as unknown[],
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
      delete: async (args: unknown) => calls.deleted.push(args),
      create: async ({ data }: { data: { role: Role } }) => {
        calls.created.push(data);
        return { id: 99n, ...data };
      },
      count: async () => otherAdmins,
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

// .env.test sets EMAIL_FROM, so every handler gets a stub instead of the real SES client.
const noMail: SendMail = async () => {};

const SUPER = actor('ADMIN', ['users:manage', 'settings:manage']);
// users:manage on a lower-ranked account: the privilege-escalation candidate.
const MANAGER = actor('DATA_ADMIN', ['users:manage', 'upload:view', 'settings:manage']);

describe('privilege escalation', () => {
  test('a user manager cannot mint an ADMIN', async () => {
    const { db, calls } = setup();
    const body = { email: 'x@example.com', fullName: 'X', role: 'ADMIN', kitchenIds: [] };
    const out = await call(createUser(db, noMail), { user: MANAGER, valid: { body } });
    assert.equal(out.status, 403);
    assert.equal(calls.created.length, 0);
  });

  test('nor promote an existing account to ADMIN', async () => {
    const { db, calls } = setup({ '5': { role: 'DATA_ADMIN', kitchenScopes: OWN_DAPUR } });
    const valid = { params: { id: 5n }, body: { role: 'ADMIN' } };
    assert.equal((await call(updateUser(db), { user: MANAGER, valid })).status, 403);
    assert.equal(calls.updated.length, 0);
  });

  test('nor touch an ADMIN (deactivate, revoke sessions)', async () => {
    const { db, calls } = setup({ '5': { role: 'ADMIN' } });
    const deactivate = { params: { id: 5n }, body: { status: 'INACTIVE' } };
    assert.equal((await call(updateUser(db), { user: MANAGER, valid: deactivate })).status, 403);
    assert.equal((await call(revokeAllUserSessions(db), { user: MANAGER, valid: { params: { id: 5n } } })).status, 403);
    assert.equal(calls.sessionsRevoked.length, 0);
  });

  test('a manager cannot hand out a role holding permissions it lacks', async () => {
    // DATA_ADMIN has upload:create, which MANAGER does not hold.
    const { db, calls } = setup();
    const body = { email: 'x@example.com', fullName: 'X', role: 'DATA_ADMIN', kitchenIds: [1n] };
    assert.equal((await call(createUser(db, noMail), { user: MANAGER, valid: { body } })).status, 403);
    assert.equal(calls.created.length, 0);
  });

  test('ADMIN may create any role, and a new DATA_ADMIN needs exactly one dapur', async () => {
    const { db } = setup();
    const make = (role: string, kitchenIds: bigint[]) =>
      call(createUser(db, noMail), {
        user: SUPER,
        valid: { body: { email: 'x@example.com', fullName: 'X', role, kitchenIds } },
      });
    assert.equal((await make('ADMIN', [])).status, 201);
    assert.equal((await make('DATA_ADMIN', [])).status, 400);
    assert.equal((await make('DATA_ADMIN', [3n, 4n])).status, 400);
    assert.equal((await make('DATA_ADMIN', [3n])).status, 201);
  });

  test('a legacy multi-dapur account can still be deactivated, but not re-scoped to several dapur', async () => {
    const legacy = [{ kitchen: { id: 1n } }, { kitchen: { id: 2n } }];
    const { db } = setup({ '5': { role: 'DATA_ADMIN', kitchenScopes: legacy } });
    const patch = (body: object) => call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body } });
    assert.equal((await patch({ status: 'INACTIVE' })).status, 200);
    assert.equal((await patch({ kitchenIds: [1n, 2n] })).status, 400);
    assert.equal((await patch({ kitchenIds: [2n] })).status, 200);
  });

  test('nobody can change their own role or status', async () => {
    const { db } = setup({ '1': { role: 'ADMIN' } });
    const valid = { params: { id: 1n }, body: { role: 'DATA_ADMIN' } };
    assert.equal((await call(updateUser(db), { user: SUPER, valid })).status, 403);
  });
});

describe('access revocation', () => {
  test('deactivating an account ends its sessions at once', async () => {
    const { db, calls } = setup({ '5': { role: 'DATA_ADMIN', kitchenScopes: OWN_DAPUR } });
    await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { status: 'INACTIVE' } } });
    assert.equal(calls.sessionsRevoked.length, 1);
  });

  test('so does a role change, but a cosmetic edit does not', async () => {
    const { db, calls } = setup({ '5': { role: 'DATA_ADMIN', kitchenScopes: OWN_DAPUR } });
    await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { fullName: 'New Name' } } });
    assert.equal(calls.sessionsRevoked.length, 0);
    await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { role: 'ADMIN' } } });
    assert.equal(calls.sessionsRevoked.length, 1);
  });

  test('role and status changes are audited with before and after', async () => {
    const { db, calls } = setup({ '5': { role: 'DATA_ADMIN', kitchenScopes: OWN_DAPUR } });
    const valid = { params: { id: 5n }, body: { role: 'ADMIN', status: 'INACTIVE' } };
    await call(updateUser(db), { user: SUPER, valid });
    const entry = calls.audit[0] as { action: string; metadata: Record<string, unknown> };
    assert.equal(entry.action, 'user.updated');
    assert.equal(entry.metadata.roleFrom, 'DATA_ADMIN');
    assert.equal(entry.metadata.roleTo, 'ADMIN');
    assert.equal(entry.metadata.statusTo, 'INACTIVE');
  });
});

describe('role permissions editor', () => {
  const put = (db: Db, user: AppUser, role: string, permissions: Permission[]) =>
    call(updateRolePermissions(db), { user, valid: { params: { role }, body: { permissions } } });

  test('ADMIN permissions are fixed', async () => {
    const { db, calls } = setup();
    assert.equal((await put(db, SUPER, 'ADMIN', [])).status, 403);
    assert.equal(calls.setPerms.length, 0);
  });

  test('ADMIN can reshape another role, and the change is audited', async () => {
    const { db, calls } = setup();
    assert.equal((await put(db, SUPER, 'DATA_ADMIN', ['upload:view'])).status, 200);
    assert.equal(calls.setPerms.length, 1);
    assert.equal((calls.audit[0] as { action: string }).action, 'role.permissions_updated');
  });

  test('a settings manager cannot edit its own role', async () => {
    const { db, calls } = setup();
    assert.equal((await put(db, MANAGER, 'DATA_ADMIN', ['upload:view'])).status, 403);
    assert.equal(calls.setPerms.length, 0);
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
    const { db, calls } = setup({ '5': { role: 'DATA_ADMIN', passwordHash: null } });
    const body = { email: 'x@example.com', fullName: 'X', role: 'DATA_ADMIN', kitchenIds: [1n] };
    const created = await call(createUser(db, noMail), { user: SUPER, valid: { body } });
    assert.ok(Math.abs(hoursFromNow(created.body?.resetTokenExpiresAt) - 72) < 0.1);

    const resent = await call(createPasswordReset(db, noMail), { user: SUPER, valid: { params: { id: 5n } } });
    assert.ok(Math.abs(hoursFromNow(resent.body?.resetTokenExpiresAt) - 72) < 0.1);
    assert.equal((calls.audit.at(-1) as { action: string }).action, 'user.invite_resent');
  });

  test('an invitation is emailed with the activation link and the admin message', async () => {
    const { db } = setup();
    const sent: { to: string; text: string }[] = [];
    const mail: SendMail = async (to, _subject, text) => void sent.push({ to, text });
    const body = { email: 'x@example.com', fullName: 'X', role: 'DATA_ADMIN', kitchenIds: [1n], message: 'Halo tim' };
    const out = await call(createUser(db, mail), { user: SUPER, valid: { body } });
    assert.equal(out.body?.emailed, true);
    assert.equal(sent[0]?.to, 'x@example.com');
    assert.ok(sent[0]?.text.includes(`https://example.com/admin/aktivasi/${out.body?.resetToken}`));
    assert.ok(sent[0]?.text.includes('Halo tim'));
  });

  test('a failing SES send does not fail the invitation; the admin gets the link instead', async () => {
    const { db } = setup();
    const mail: SendMail = async () => Promise.reject(new Error('ses down'));
    const body = { email: 'x@example.com', fullName: 'X', role: 'DATA_ADMIN', kitchenIds: [1n] };
    const out = await call(createUser(db, mail), { user: SUPER, valid: { body } });
    assert.equal(out.status, 201);
    assert.equal(out.body?.emailed, false);
  });

  test('a password reset for an active account keeps the short reset lifetime', async () => {
    const { db, calls } = setup({ '5': { role: 'DATA_ADMIN', passwordHash: 'h' } });
    const out = await call(createPasswordReset(db, noMail), { user: SUPER, valid: { params: { id: 5n } } });
    assert.ok(hoursFromNow(out.body?.resetTokenExpiresAt) <= 1);
    assert.equal((calls.audit.at(-1) as { action: string }).action, 'user.password_reset_issued');
  });

  test('cancelling an invitation deletes the account and is audited', async () => {
    const { db, calls } = setup({ '5': { role: 'DATA_ADMIN', passwordHash: null } });
    const out = await call(cancelInvite(db), { user: SUPER, valid: { params: { id: 5n } } });
    assert.equal(out.status, 204);
    assert.deepEqual((calls.deleted[0] as { where: unknown }).where, { id: 5n });
    assert.equal((calls.audit[0] as { action: string }).action, 'user.invite_cancelled');
  });

  test('only an account without a password can be cancelled, and not by someone below its role', async () => {
    const active = setup({ '5': { role: 'DATA_ADMIN', passwordHash: 'h' } });
    assert.equal((await call(cancelInvite(active.db), { user: SUPER, valid: { params: { id: 5n } } })).status, 409);
    const pm = setup({ '5': { role: 'ADMIN', passwordHash: null } });
    assert.equal((await call(cancelInvite(pm.db), { user: MANAGER, valid: { params: { id: 5n } } })).status, 403);
    assert.equal(active.calls.deleted.length + pm.calls.deleted.length, 0);
  });

  test('the last active ADMIN can be neither deactivated nor demoted', async () => {
    const { db, calls } = setup({ '5': { role: 'ADMIN' } }, { otherAdmins: 0 });
    for (const body of [{ status: 'INACTIVE' }, { role: 'DATA_ADMIN' }]) {
      const out = await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body } });
      assert.equal(out.status, 409);
      assert.equal(out.body?.error, 'last_admin');
    }
    assert.equal(calls.updated.length, 0);
  });

  test('with another active ADMIN left, deactivating one is allowed', async () => {
    const { db, calls } = setup({ '5': { role: 'ADMIN' } }, { otherAdmins: 1 });
    const out = await call(updateUser(db), { user: SUPER, valid: { params: { id: 5n }, body: { status: 'INACTIVE' } } });
    assert.equal(out.status, 200);
    assert.equal(calls.updated.length, 1);
  });
});
