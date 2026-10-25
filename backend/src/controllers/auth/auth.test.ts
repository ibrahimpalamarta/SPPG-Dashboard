import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, RequestHandler, Response } from 'express';
import { generate } from 'otplib';
import type { Db } from '../../db.js';
import { hashPassword } from '../../auth/password.js';
import { newTotpSecret } from '../../auth/mfa.js';
import { decrypt, sha256, signChallenge } from '../../lib/crypto.js';
import { changePassword, getInvitation, login, logout, mfaDisable, mfaEnable, resetPassword, verifyMfa } from './auth.js';

const PASSWORD = 'Correct-Horse-9';
const NEW_PASSWORD = 'Another-Horse-42';

interface Row {
  [key: string]: unknown;
}

/**
 * In-memory stand-in for the handful of Prisma calls the auth controllers
 * make. Not a general fake: it understands exactly the `where` shapes used.
 */
async function fakeDb() {
  const users: Row[] = [
    {
      id: 1n,
      email: 'pic@example.com',
      role: 'DATA_ADMIN',
      status: 'ACTIVE',
      passwordHash: await hashPassword(PASSWORD),
      failedLoginCount: 0,
      lockedUntil: null,
      mfaEnabled: false,
      mfaSecretEnc: null,
    },
  ];
  const sessions: Row[] = [];
  const resets: Row[] = [];
  const recovery: Row[] = [];
  const audit: Row[] = [];

  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([k, v]) => {
      if (v !== null && typeof v === 'object' && 'not' in v) return row[k] !== (v as Row).not;
      return row[k] === v;
    });
  const apply = (row: Row, data: Row) => {
    for (const [k, v] of Object.entries(data)) {
      row[k] = v !== null && typeof v === 'object' && 'increment' in v ? (row[k] as number) + (v as Row).increment! : v;
    }
  };
  const updateMany = (table: Row[]) => async ({ where, data }: { where: Row; data: Row }) => {
    const hit = table.filter((r) => matches(r, where));
    hit.forEach((r) => apply(r, data));
    return { count: hit.length };
  };

  const db = {
    user: {
      findUnique: async ({ where }: { where: Row }) => users.find((u) => matches(u, where)) ?? null,
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = users.find((u) => matches(u, where))!;
        apply(row, data);
        return row;
      },
    },
    session: {
      create: async ({ data }: { data: Row }) => sessions.push({ id: BigInt(sessions.length + 1), revokedAt: null, ...data }),
      updateMany: updateMany(sessions),
    },
    passwordResetToken: {
      findUnique: async ({ where }: { where: Row }) => {
        const row = resets.find((r) => matches(r, where));
        return row && { ...row, user: users.find((u) => u.id === row.userId) };
      },
      updateMany: updateMany(resets),
    },
    mfaRecoveryCode: {
      updateMany: updateMany(recovery),
      deleteMany: async ({ where }: { where: Row }) => {
        for (let i = recovery.length - 1; i >= 0; i--) if (matches(recovery[i]!, where)) recovery.splice(i, 1);
        return { count: 0 };
      },
      createMany: async ({ data }: { data: Row[] }) => recovery.push(...data.map((d) => ({ usedAt: null, ...d }))),
    },
    auditLog: { create: async ({ data }: { data: Row }) => audit.push(data) },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as Db;

  return { db, users, sessions, resets, recovery, audit };
}

async function call(handler: RequestHandler, req: Partial<Request>) {
  const out: { status?: number; body?: Record<string, unknown> } = {};
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(payload: unknown) {
      out.body = JSON.parse(JSON.stringify(payload, (_k, v: unknown) => (typeof v === 'bigint' ? String(v) : v))) as Record<string, unknown>;
      return this;
    },
    end() {
      out.status ??= 200;
      return this;
    },
  } as unknown as Response;
  await handler({ ip: '10.0.0.1', get: () => 'test-agent', ...req } as Request, res, () => {});
  return out;
}

const withBody = (body: unknown) => ({ valid: { body } }) as Partial<Request>;

describe('login', () => {
  test('valid credentials open a session and return the raw token once', async () => {
    const { db, sessions, users } = await fakeDb();
    const out = await call(login(db), withBody({ email: 'pic@example.com', password: PASSWORD }));

    assert.equal(out.status, 200);
    assert.equal(out.body?.status, 'ok');
    const token = out.body?.token as string;
    assert.ok(token.length >= 40);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0]!.tokenHash, sha256(token));
    assert.ok(!Object.values(sessions[0]!).includes(token), 'raw token must not be stored');
    assert.ok(users[0]!.lastLoginAt instanceof Date);
  });

  test('wrong password, unknown email, disabled and password-less accounts share one response', async () => {
    const { db, users } = await fakeDb();
    users.push(
      { id: 2n, email: 'off@example.com', role: 'INTERNAL', status: 'INACTIVE', passwordHash: users[0]!.passwordHash, failedLoginCount: 0, lockedUntil: null },
      { id: 3n, email: 'new@example.com', role: 'INTERNAL', status: 'ACTIVE', passwordHash: null, failedLoginCount: 0, lockedUntil: null },
    );
    const attempts = [
      { email: 'pic@example.com', password: 'wrong-password-1A' },
      { email: 'ghost@example.com', password: PASSWORD },
      { email: 'off@example.com', password: PASSWORD },
      { email: 'new@example.com', password: PASSWORD },
    ];
    const outs = await Promise.all(attempts.map((a) => call(login(db), withBody(a))));
    for (const o of outs) assert.equal(o.status, 401);
    assert.equal(new Set(outs.map((o) => JSON.stringify(o.body))).size, 1);
  });

  test('locks the account after the failure budget, even for the right password', async () => {
    const { db, users, sessions } = await fakeDb();
    for (let i = 0; i < 5; i++) {
      await call(login(db), withBody({ email: 'pic@example.com', password: 'wrong-password-1A' }));
    }
    assert.ok((users[0]!.lockedUntil as Date).getTime() > Date.now());

    const out = await call(login(db), withBody({ email: 'pic@example.com', password: PASSWORD }));
    assert.equal(out.status, 401);
    assert.equal(sessions.length, 0);
  });

  test('a successful login clears earlier failures', async () => {
    const { db, users } = await fakeDb();
    await call(login(db), withBody({ email: 'pic@example.com', password: 'wrong-password-1A' }));
    assert.equal(users[0]!.failedLoginCount, 1);
    await call(login(db), withBody({ email: 'pic@example.com', password: PASSWORD }));
    assert.equal(users[0]!.failedLoginCount, 0);
  });

  test('audits success and failure without ever logging the password or token', async () => {
    const { db, audit } = await fakeDb();
    await call(login(db), withBody({ email: 'pic@example.com', password: 'wrong-password-1A' }));
    const ok = await call(login(db), withBody({ email: 'pic@example.com', password: PASSWORD }));

    assert.deepEqual(audit.map((a) => a.action), ['auth.login.failed', 'auth.login.success']);
    const dump = JSON.stringify(audit, (_k, v: unknown) => (typeof v === 'bigint' ? String(v) : v));
    assert.ok(!dump.includes(PASSWORD) && !dump.includes('wrong-password-1A'));
    assert.ok(!dump.includes(ok.body?.token as string));
  });

  test('an MFA-enabled account gets a challenge, not a session', async () => {
    const { db, users, sessions } = await fakeDb();
    users[0]!.mfaEnabled = true;
    const out = await call(login(db), withBody({ email: 'pic@example.com', password: PASSWORD }));
    assert.equal(out.body?.status, 'mfa_required');
    assert.equal(out.body?.token, undefined);
    assert.equal(sessions.length, 0);
  });
});

describe('MFA', () => {
  async function enrolled() {
    const f = await fakeDb();
    const { secret, encrypted } = newTotpSecret('pic@example.com');
    Object.assign(f.users[0]!, { mfaEnabled: true, mfaSecretEnc: encrypted });
    return { ...f, secret };
  }
  const challenge = () => signChallenge(1n, 60_000);

  test('a valid TOTP code completes the login', async () => {
    const { db, secret, sessions } = await enrolled();
    const out = await call(verifyMfa(db), withBody({ mfaToken: challenge(), code: await generate({ secret }) }));
    assert.equal(out.body?.status, 'ok');
    assert.equal(sessions.length, 1);
  });

  test('a wrong code, a forged challenge and an expired challenge are all refused', async () => {
    const { db, sessions } = await enrolled();
    const bad = [
      { mfaToken: challenge(), code: '000000' },
      { mfaToken: `${challenge()}x`, code: '123456' },
      { mfaToken: signChallenge(1n, 60_000, Date.now() - 120_000), code: '123456' },
    ];
    for (const body of bad) assert.equal((await call(verifyMfa(db), withBody(body))).status, 401);
    assert.equal(sessions.length, 0);
  });

  test('a challenge for user 1 cannot be edited into one for user 2', async () => {
    const { db } = await enrolled();
    const [, exp, mac] = challenge().split('.');
    assert.equal((await call(verifyMfa(db), withBody({ mfaToken: `2.${exp}.${mac}`, code: '123456' }))).status, 401);
  });

  test('a recovery code works exactly once', async () => {
    const { db, recovery, sessions } = await enrolled();
    recovery.push({ userId: 1n, codeHash: sha256('abcd-abcd-abcd-abcd'), usedAt: null });

    const first = await call(verifyMfa(db), withBody({ mfaToken: challenge(), code: 'abcd-abcd-abcd-abcd' }));
    const second = await call(verifyMfa(db), withBody({ mfaToken: challenge(), code: 'abcd-abcd-abcd-abcd' }));
    assert.equal(first.body?.status, 'ok');
    assert.equal(second.status, 401);
    assert.equal(sessions.length, 1);
  });

  test('enrolment: setup secret is stored encrypted, enable needs a valid code and returns recovery codes', async () => {
    const { db, users, recovery } = await fakeDb();
    const { secret, encrypted } = newTotpSecret('pic@example.com');
    users[0]!.mfaSecretEnc = encrypted;
    assert.equal(decrypt(encrypted), secret);
    assert.ok(!encrypted.includes(secret));

    const req = { user: { id: 1n }, sessionId: 1n } as Partial<Request>;
    const refused = await call(mfaEnable(db), { ...req, ...withBody({ code: '000000' }) });
    assert.equal(refused.status, 401);
    assert.equal(users[0]!.mfaEnabled, false);

    const ok = await call(mfaEnable(db), { ...req, ...withBody({ code: await generate({ secret }) }) });
    assert.equal(users[0]!.mfaEnabled, true);
    assert.equal((ok.body?.recoveryCodes as string[]).length, 10);
    assert.equal(recovery.length, 10);
    assert.ok(recovery.every((r) => (r.codeHash as string).length === 64), 'only hashes are stored');
  });

  test('a role that must use MFA cannot switch it off', async () => {
    const { db, secret, users } = await enrolled();
    // MFA_REQUIRED_ROLES is read at module load; this asserts the unrestricted path instead.
    const out = await call(mfaDisable(db), {
      user: { id: 1n },
      ...withBody({ password: PASSWORD, code: await generate({ secret }) }),
    });
    assert.equal(out.status, 204);
    assert.equal(users[0]!.mfaEnabled, false);
  });
});

describe('resetPassword', () => {
  const TOKEN = 'T'.repeat(43);

  async function withToken(patch: Row = {}) {
    const f = await fakeDb();
    f.resets.push({ id: 1n, userId: 1n, tokenHash: sha256(TOKEN), expiresAt: new Date(Date.now() + 60_000), usedAt: null, ...patch });
    f.sessions.push({ id: 1n, userId: 1n, revokedAt: null });
    return f;
  }

  test('sets the new password, spends the token and ends every session', async () => {
    const f = await withToken();
    const out = await call(resetPassword(f.db), withBody({ token: TOKEN, password: NEW_PASSWORD }));

    assert.equal(out.status, 204);
    assert.notEqual(f.users[0]!.passwordHash, null);
    assert.ok(f.resets[0]!.usedAt instanceof Date);
    assert.ok(f.sessions[0]!.revokedAt instanceof Date);
    assert.ok(!(f.users[0]!.passwordHash as string).includes(NEW_PASSWORD));
  });

  test('the token is single-use', async () => {
    const f = await withToken();
    await call(resetPassword(f.db), withBody({ token: TOKEN, password: NEW_PASSWORD }));
    const again = await call(resetPassword(f.db), withBody({ token: TOKEN, password: 'Third-Horse-777' }));
    assert.equal(again.status, 400);
  });

  test('an expired token, an unknown token and a disabled account are all refused alike', async () => {
    const expired = await withToken({ expiresAt: new Date(Date.now() - 1) });
    const disabled = await withToken();
    disabled.users[0]!.status = 'INACTIVE';
    const outs = [
      await call(resetPassword(expired.db), withBody({ token: TOKEN, password: NEW_PASSWORD })),
      await call(resetPassword((await withToken()).db), withBody({ token: 'U'.repeat(43), password: NEW_PASSWORD })),
      await call(resetPassword(disabled.db), withBody({ token: TOKEN, password: NEW_PASSWORD })),
    ];
    for (const o of outs) assert.equal(o.status, 400);
    assert.equal(new Set(outs.map((o) => JSON.stringify(o.body))).size, 1);
  });

  test('the old password stops working and the new one works', async () => {
    const f = await withToken();
    await call(resetPassword(f.db), withBody({ token: TOKEN, password: NEW_PASSWORD }));
    assert.equal((await call(login(f.db), withBody({ email: 'pic@example.com', password: PASSWORD }))).status, 401);
    assert.equal((await call(login(f.db), withBody({ email: 'pic@example.com', password: NEW_PASSWORD }))).body?.status, 'ok');
  });

  test('SCRUM-122: the first password activates the account and opens a session', async () => {
    const f = await withToken();
    f.users[0]!.passwordHash = null;
    const out = await call(resetPassword(f.db), withBody({ token: TOKEN, password: NEW_PASSWORD }));

    assert.equal(out.body?.status, 'ok');
    assert.equal(typeof out.body?.token, 'string');
    assert.equal(f.sessions.filter((s) => !s.revokedAt).length, 1);
    assert.ok(f.audit.some((a) => a.action === 'user.activated'));
  });

  test('clears a lockout so the owner can get back in', async () => {
    const f = await withToken();
    f.users[0]!.lockedUntil = new Date(Date.now() + 600_000);
    await call(resetPassword(f.db), withBody({ token: TOKEN, password: NEW_PASSWORD }));
    assert.equal(f.users[0]!.lockedUntil, null);
  });
});

describe('logout / changePassword', () => {
  test('logout revokes only the current session', async () => {
    const { db, sessions } = await fakeDb();
    sessions.push({ id: 1n, userId: 1n, revokedAt: null }, { id: 2n, userId: 1n, revokedAt: null });
    await call(logout(db), { user: { id: 1n }, sessionId: 1n } as Partial<Request>);
    assert.ok(sessions[0]!.revokedAt instanceof Date);
    assert.equal(sessions[1]!.revokedAt, null);
  });

  test('changing the password signs out every other session but keeps this one', async () => {
    const { db, sessions } = await fakeDb();
    sessions.push({ id: 1n, userId: 1n, revokedAt: null }, { id: 2n, userId: 1n, revokedAt: null });
    const out = await call(changePassword(db), {
      user: { id: 1n },
      sessionId: 1n,
      ...withBody({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD }),
    } as Partial<Request>);
    assert.equal(out.status, 204);
    assert.equal(sessions[0]!.revokedAt, null);
    assert.ok(sessions[1]!.revokedAt instanceof Date);
  });

  test('a wrong current password is refused and counts toward lockout', async () => {
    const { db, users } = await fakeDb();
    const out = await call(changePassword(db), {
      user: { id: 1n },
      sessionId: 1n,
      ...withBody({ currentPassword: 'wrong-password-1A', newPassword: NEW_PASSWORD }),
    } as Partial<Request>);
    assert.equal(out.status, 401);
    assert.equal(users[0]!.failedLoginCount, 1);
  });
});

describe('SCRUM-122: getInvitation', () => {
  const TOKEN = 'I'.repeat(43);
  async function invited(patch: Row = {}) {
    const f = await fakeDb();
    f.users[0]!.passwordHash = null;
    f.resets.push({ id: 1n, userId: 1n, tokenHash: sha256(TOKEN), expiresAt: new Date(Date.now() + 60_000), usedAt: null, ...patch });
    return f;
  }
  const ask = (db: Db, token = TOKEN) => call(getInvitation(db), { valid: { params: { token } } });

  test('an open invitation shows who it is for and the role, nothing else', async () => {
    const out = await ask((await invited()).db);
    assert.deepEqual(out.body, { email: 'pic@example.com', role: 'DATA_ADMIN' });
  });

  test('expired, used, cancelled, unknown, or a reset link of an active account are refused alike', async () => {
    const withPassword = await invited();
    withPassword.users[0]!.passwordHash = 'h';
    const cancelled = await invited();
    cancelled.users[0]!.status = 'INACTIVE';
    const outs = [
      await ask((await invited({ expiresAt: new Date(Date.now() - 1) })).db),
      await ask((await invited({ usedAt: new Date() })).db),
      await ask(cancelled.db),
      await ask((await invited()).db, 'J'.repeat(43)),
      await ask(withPassword.db),
    ];
    for (const o of outs) assert.equal(o.status, 400);
    assert.equal(new Set(outs.map((o) => JSON.stringify(o.body))).size, 1);
  });
});
