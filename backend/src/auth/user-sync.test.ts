import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { AppUser } from './user-sync.js';
import type { Db } from '../db.js';
import { findOrCreateUser } from './user-sync.js';
import { roleFromClaims } from './roles.js';
import type { AuthContext } from './jwt.js';

/** Minimal in-memory stand-in for the two tables the auth module touches. */
function fakeDb(seed: AppUser[] = []) {
  const users = new Map(seed.map((u) => [u.auth0Sub, u]));
  const audits: { action: string; entityId: bigint | null }[] = [];
  const calls = { findUnique: 0, upsert: 0 };

  const db = {
    user: {
      async findUnique({ where }: { where: { auth0Sub: string } }) {
        calls.findUnique++;
        return users.get(where.auth0Sub) ?? null;
      },
      async upsert({ where, create, update }: any) {
        calls.upsert++;
        const existing = users.get(where.auth0Sub);
        const next: AppUser = existing
          ? { ...existing, ...stripUndefined(update), updatedAt: new Date() }
          : {
              id: BigInt(users.size + 1),
              kitchenScopes: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              email: null,
              fullName: null,
              status: 'ACTIVE',
              lastLoginAt: null,
              ...stripUndefined(create),
            };
        users.set(where.auth0Sub, next);
        return next;
      },
    },
    auditLog: {
      async create({ data }: any) {
        audits.push({ action: data.action, entityId: data.entityId });
        return data;
      },
    },
  } as unknown as Db;

  return { db, users, audits, calls };
}

const stripUndefined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const ctx = (over: Partial<AuthContext> = {}): AuthContext => ({
  sub: 'auth0|abc123',
  email: 'Person@Example.com',
  name: 'Person',
  roleClaims: ['internal'],
  ...over,
});

describe('roleFromClaims', () => {
  test('maps known Auth0 role names', () => {
    assert.equal(roleFromClaims(['super_admin']), 'SUPER_ADMIN');
    assert.equal(roleFromClaims(['data_admin']), 'DATA_ADMIN');
    assert.equal(roleFromClaims(['internal']), 'INTERNAL');
  });

  test('picks the highest role when several are present', () => {
    assert.equal(roleFromClaims(['internal', 'super_admin', 'public']), 'SUPER_ADMIN');
  });

  test('falls back to PUBLIC for missing, unknown or malformed claims', () => {
    assert.equal(roleFromClaims(undefined), 'PUBLIC');
    assert.equal(roleFromClaims('super_admin'), 'PUBLIC');
    assert.equal(roleFromClaims(['root', 'admin']), 'PUBLIC');
    assert.equal(roleFromClaims([{ name: 'super_admin' }]), 'PUBLIC');
  });
});

describe('findOrCreateUser', () => {
  test('creates a row on first sight and normalises the email', async () => {
    const { db, users, audits } = fakeDb();
    const user = await findOrCreateUser(ctx(), db);

    assert.equal(users.size, 1);
    assert.equal(user.auth0Sub, 'auth0|abc123');
    assert.equal(user.email, 'person@example.com');
    assert.equal(user.role, 'INTERNAL');
    assert.deepEqual(user.kitchenScopes, []);
    assert.deepEqual(
      audits.map((a) => a.action),
      ['user.provisioned'],
    );
  });

  test('is idempotent — a second login writes nothing', async () => {
    const { db, users, audits, calls } = fakeDb();
    const first = await findOrCreateUser(ctx(), db);
    const second = await findOrCreateUser(ctx(), db);

    assert.equal(users.size, 1);
    assert.equal(second.id, first.id);
    assert.equal(calls.upsert, 1, 'no write on the unchanged path');
    assert.equal(audits.length, 1);
  });

  test('SCRUM-20: a later token claim never changes the stored role', async () => {
    const { db, audits } = fakeDb();
    await findOrCreateUser(ctx(), db);
    const again = await findOrCreateUser(
      ctx({ email: 'new@example.com', roleClaims: ['super_admin'] }),
      db,
    );

    assert.equal(again.role, 'INTERNAL');
    assert.equal(again.email, 'new@example.com');
    assert.deepEqual(
      audits.map((a) => a.action),
      ['user.provisioned'],
    );
  });

  test('a token with no roles claim provisions the least privileged role', async () => {
    const { db } = fakeDb();
    const user = await findOrCreateUser(ctx({ roleClaims: undefined }), db);
    assert.equal(user.role, 'PUBLIC');
  });

  test('never lets a token claim set kitchen scope', async () => {
    const { db } = fakeDb();
    const user = await findOrCreateUser(
      // Kitchen scope is not a field the token can carry — prove it stays empty
      // even when a caller stuffs one into the claims.
      { ...ctx(), roleClaims: ['data_admin'], ...({ kitchenScopes: [{ kitchenId: 9n }] } as object) },
      db,
    );
    assert.deepEqual(user.kitchenScopes, []);
    assert.equal(user.role, 'DATA_ADMIN');
  });

  test('does not store anything credential-shaped', async () => {
    const { db, users } = fakeDb();
    await findOrCreateUser(ctx(), db);
    // BigInt has no JSON representation, so ids are stringified explicitly —
    // the point of the assertion is the row's *content*, not its id type.
    const stored = JSON.stringify([...users.values()], (_k, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );

    for (const forbidden of ['password', 'token', 'secret']) {
      assert.equal(stored.toLowerCase().includes(forbidden), false, `stored row contains "${forbidden}"`);
    }
  });
});
