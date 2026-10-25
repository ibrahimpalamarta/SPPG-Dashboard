import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { Db } from '../../db.js';
import type { Role } from '../../auth/roles.js';
import type { AppUser } from '../../auth/user.js';
import { getMe } from './me.js';

const PERMS: Record<Role, AppUser['permissions']> = {
  SUPER_ADMIN: ['upload:create', 'batch:review'],
  DATA_ADMIN: ['upload:create', 'mapping:propose'],
  CMS_ADMIN: [],
  INTERNAL: [],
  PUBLIC: [],
};

const userWith = (role: Role, ...kitchenIds: bigint[]): AppUser => ({
  id: 7n,
  email: 'pic@example.com',
  fullName: 'PIC Sukun',
  role,
  status: 'ACTIVE',
  lastLoginAt: new Date(),
  failedLoginCount: 2,
  lockedUntil: null,
  mfaEnabled: true,
  permissions: PERMS[role],
  kitchenScopes: kitchenIds.map((kitchenId) => ({ kitchenId })),
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function run(user: AppUser) {
  let where: unknown;
  const db = {
    kitchen: {
      findMany: async (args: { where: unknown }) => {
        where = args.where;
        return [{ id: 2n, code: 'SKN', name: 'Sukun' }];
      },
    },
  } as unknown as Db;

  let body: Record<string, unknown> = {};
  const res = {
    status() {
      return this;
    },
    json(payload: unknown) {
      body = payload as Record<string, unknown>;
      return this;
    },
  } as unknown as Response;

  await getMe(db)({ user } as Request, res, () => {});
  return { body, where };
}

describe('GET /api/me (SCRUM-20)', () => {
  test('returns only the shell fields — no status, lockout counters or timestamps', async () => {
    const { body } = await run(userWith('DATA_ADMIN', 2n));
    assert.deepEqual(Object.keys(body).sort(), ['email', 'fullName', 'id', 'kitchens', 'mfaEnabled', 'mfaEnrollmentRequired', 'permissions', 'role']);
    assert.deepEqual(body.kitchens, [{ id: '2', code: 'SKN', name: 'Sukun', rolloutStatus: 'PILOT_PHASE_1' }]);
  });

  test('narrows the kitchen list to the scope of a scoped role', async () => {
    const { where } = await run(userWith('DATA_ADMIN', 2n));
    assert.deepEqual(where, { id: { in: [2n] } });
  });

  test('a scoped role with no kitchens gets an empty filter, not every kitchen', async () => {
    const { where } = await run(userWith('DATA_ADMIN'));
    assert.deepEqual(where, { id: { in: [] } });
  });

  test('exposes the permissions loaded for the request, including mapping:propose for DATA_ADMIN', async () => {
    const { body } = await run(userWith('DATA_ADMIN', 2n));
    assert.ok((body.permissions as string[]).includes('mapping:propose'));
    assert.ok(!(body.permissions as string[]).includes('batch:review'));
  });
});
